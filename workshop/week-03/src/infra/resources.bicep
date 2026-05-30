// ---------------------------------------------------------------------------
// resources.bicep — RG-scoped. Provisions:
//   - Log Analytics + Application Insights
//   - User-Assigned Managed Identity (UAMI)
//   - Azure Container Registry (admin disabled, AcrPull granted to UAMI)
//   - Azure Container Apps Environment (Consumption, Workspace logs)
//   - api  Container App  (internal ingress, target port 8000)
//   - web  Container App  (external ingress, target port 8080)
// ---------------------------------------------------------------------------
@minLength(1)
param location string
param tags object
param resourceToken string

@secure()
param neisApiKey string

@description('Optional: principal ID of the deploying user/SP for additional RBAC. Empty to skip.')
param principalId string = ''

// ---------------------------------------------------------------------------
// Naming. Deterministic so cross-app references can be pre-computed
// (avoids a circular reference between api and web).
// ---------------------------------------------------------------------------
var logAnalyticsName  = 'log-${resourceToken}'
var appInsightsName   = 'appi-${resourceToken}'
var uamiName          = 'id-${resourceToken}'
var registryName      = 'cr${resourceToken}'
var containerEnvName  = 'cae-${resourceToken}'
var apiAppName        = 'ca-api-${resourceToken}'
var webAppName        = 'ca-web-${resourceToken}'

// Placeholder image used at provision time; azd overwrites it with the
// real one during `azd deploy`. Must be a valid public image.
var placeholderImage = 'mcr.microsoft.com/k8se/quickstart:latest'

// AcrPull role definition GUID
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: 1
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: uamiName
  location: location
  tags: tags
}

// ---------------------------------------------------------------------------
// Container Registry (admin disabled; UAMI pulls via AcrPull)
// ---------------------------------------------------------------------------
resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
    zoneRedundancy: 'Disabled'
  }
}

resource acrPullForUami 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, uami.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

// Optional: also grant AcrPush to the deploying principal so `azd deploy`
// (which runs `az acr login` + `docker push` from your machine) works
// without admin creds. Skipped when principalId is empty.
var acrPushRoleId = '8311e382-0749-4cb8-b61a-304f252e45ec'
resource acrPushForUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  name: guid(registry.id, principalId, acrPushRoleId)
  scope: registry
  properties: {
    principalId: principalId
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPushRoleId)
  }
}

// ---------------------------------------------------------------------------
// Container Apps Environment (Consumption)
// ---------------------------------------------------------------------------
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerEnvName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

// Pre-compute the FQDNs so api can know web's URL (CORS) and web can
// know api's URL (proxy) without a circular reference.
var apiInternalFqdn  = '${apiAppName}.internal.${containerEnv.properties.defaultDomain}'
var webExternalFqdn  = '${webAppName}.${containerEnv.properties.defaultDomain}'
var apiInternalUri   = 'https://${apiInternalFqdn}'
var webExternalUri   = 'https://${webExternalFqdn}'

// ---------------------------------------------------------------------------
// API container app — internal ingress, target port 8000
// ---------------------------------------------------------------------------
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiAppName
  location: location
  // azd-service-name MUST match the service key in azure.yaml ('api').
  tags: union(tags, { 'azd-service-name': 'api' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: uami.id
        }
      ]
      secrets: [
        {
          name: 'neis-api-key'
          value: neisApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: placeholderImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'NEIS_API_KEY'
              secretRef: 'neis-api-key'
            }
            {
              name: 'NEIS_BASE_URL'
              value: 'https://open.neis.go.kr/hub'
            }
            {
              name: 'CORS_ORIGINS'
              value: '["${webExternalUri}"]'
            }
            {
              name: 'PORT'
              value: '8000'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 8000
              }
              initialDelaySeconds: 5
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 8000
              }
              initialDelaySeconds: 2
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullForUami
  ]
}

// ---------------------------------------------------------------------------
// WEB container app — external ingress, target port 8080
// ---------------------------------------------------------------------------
resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: webAppName
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: uami.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: placeholderImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              // Consumed by nginx envsubst at startup. HTTPS because ACA
              // internal ingress terminates TLS at the env's edge.
              name: 'API_UPSTREAM'
              value: apiInternalUri
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: 8080
              }
              initialDelaySeconds: 2
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullForUami
    apiApp
  ]
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output containerRegistryEndpoint string = registry.properties.loginServer
output containerRegistryName string = registry.name
output containerAppsEnvironmentId string = containerEnv.id
output containerAppsEnvironmentDefaultDomain string = containerEnv.properties.defaultDomain
output apiAppName string = apiApp.name
output apiInternalUri string = apiInternalUri
output webAppName string = webApp.name
output webUri string = webExternalUri
