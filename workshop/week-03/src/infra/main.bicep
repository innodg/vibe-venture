// ---------------------------------------------------------------------------
// main.bicep — subscription-scoped entry point invoked by `azd up`.
// Creates the resource group and delegates everything else to resources.bicep.
// ---------------------------------------------------------------------------
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the azd environment. Used to scope and tag resources.')
param environmentName string

@minLength(1)
@description('Azure region for all resources.')
param location string

@secure()
@description('NEIS Open API key. Stored as a Container App secret on the api service.')
param neisApiKey string

@description('Optional: principal ID of the deploying user/SP. Used only if you want to grant additional dataplane RBAC; leave empty to skip.')
param principalId string = ''

@description('Optional: override the resource group name. Defaults to rg-<environmentName>.')
param resourceGroupName string = ''

var tags = {
  'azd-env-name': environmentName
}

var rgName = !empty(resourceGroupName) ? resourceGroupName : 'rg-${environmentName}'
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
    neisApiKey: neisApiKey
    principalId: principalId
  }
}

// ---------------------------------------------------------------------------
// Outputs consumed by azd (registry endpoint is required for image push).
// ---------------------------------------------------------------------------
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = rg.name

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.containerRegistryEndpoint
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.containerRegistryName

output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = resources.outputs.containerAppsEnvironmentId
output AZURE_CONTAINER_APPS_ENVIRONMENT_DEFAULT_DOMAIN string = resources.outputs.containerAppsEnvironmentDefaultDomain

output SERVICE_API_NAME string = resources.outputs.apiAppName
output SERVICE_API_INTERNAL_URI string = resources.outputs.apiInternalUri

output SERVICE_WEB_NAME string = resources.outputs.webAppName
output SERVICE_WEB_URI string = resources.outputs.webUri
