import { http, HttpResponse } from 'msw'
import type { Meal, School } from '@/types'

export const sampleSchools: School[] = [
  {
    schoolCode: '7010806',
    eduOfficeCode: 'B10',
    schoolName: '서울고등학교',
    eduOfficeName: '서울특별시교육청',
    lctnScNm: '서울특별시',
  },
  {
    schoolCode: '7010807',
    eduOfficeCode: 'B10',
    schoolName: '서울중학교',
    eduOfficeName: '서울특별시교육청',
    lctnScNm: '서울특별시',
  },
]

export const sampleMeals: Meal[] = [
  {
    date: '2024-03-01',
    dishes: ['쌀밥', '김치찌개', '제육볶음'],
    calorie: '850 Kcal',
    origin: ['쌀: 국내산'],
    nutrition: ['탄수화물 (g) : 80'],
    servings: 120.5,
  },
]

export const handlers = [
  http.get('/api/schools', ({ request }) => {
    const url = new URL(request.url)
    const name = url.searchParams.get('name')
    if (!name) {
      return HttpResponse.json({ detail: 'name required' }, { status: 422 })
    }
    if (name === '없는학교') {
      return HttpResponse.json([])
    }
    if (name === 'fail') {
      return HttpResponse.json({ detail: 'oops' }, { status: 500 })
    }
    return HttpResponse.json(sampleSchools)
  }),
  http.get('/api/meals', () => {
    return HttpResponse.json(sampleMeals)
  }),
]
