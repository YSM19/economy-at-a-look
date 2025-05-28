/**
 * 앱 테스트를 위한 모의 데이터
 * 실제 API 연결이 안 될 경우 사용
 */

// 환율 모의 데이터
export const mockExchangeRate = {
  // 오늘의 환율 데이터
  todayRates: {
    data: [
      {
        date: new Date().toISOString().split('T')[0],
        curUnit: "USD",
        curNm: "미국 달러",
        dealBasR: "1,364.00",
        bkpr: "1,364.00",
        ttb: "1,350.50",
        tts: "1,377.51"
      },
      {
        date: new Date().toISOString().split('T')[0],
        curUnit: "EUR",
        curNm: "유럽연합 유로",
        dealBasR: "1,470.00",
        bkpr: "1,470.00",
        ttb: "1,455.25",
        tts: "1,484.36"
      },
      {
        date: new Date().toISOString().split('T')[0],
        curUnit: "JPY",
        curNm: "일본 엔",
        dealBasR: "9.10",
        bkpr: "9.10",
        ttb: "9.0134",
        tts: "9.1937"
      }
    ]
  },
  
  // 최근 환율 데이터
  latestRates: {
    data: [
      {
        date: new Date().toISOString().split('T')[0],
        curUnit: "USD",
        curNm: "미국 달러",
        dealBasR: "1,364.00",
        bkpr: "1,364.00",
        ttb: "1,350.50",
        tts: "1,377.51"
      },
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        curUnit: "USD",
        curNm: "미국 달러",
        dealBasR: "1,362.50",
        bkpr: "1,362.50",
        ttb: "1,349.00",
        tts: "1,376.00"
      },
      {
        date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        curUnit: "USD",
        curNm: "미국 달러",
        dealBasR: "1,365.75",
        bkpr: "1,365.75",
        ttb: "1,352.25",
        tts: "1,379.26"
      }
    ]
  },
  
  // 경제 지표 데이터
  economicIndex: {
    data: {
      indexValue: 65.8,
      indexStatus: "경기확장",
      date: new Date().toISOString().split('T')[0]
    }
  },
  
  // 통합 환율 데이터
  exchangeRateData: {
    data: {
      usdRate: 1364.00,
      eurRate: 1470.00,
      jpyRate: 9.10,
      cnyRate: 190.43,
      history: [
        {
          date: new Date().toISOString().split('T')[0],
          curUnit: "USD",
          curNm: "미국 달러",
          dealBasR: "1,364.00"
        },
        {
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          curUnit: "USD",
          curNm: "미국 달러",
          dealBasR: "1,362.50"
        },
        {
          date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          curUnit: "USD",
          curNm: "미국 달러",
          dealBasR: "1,365.75"
        }
      ]
    }
  }
}; 