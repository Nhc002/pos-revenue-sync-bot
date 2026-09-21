const { syncCashbookToGoogleSheets } = require('../services/sheetsSync');
const logger = require('../utils/logger');

async function testCashbookSync() {
  logger.info('=== BẮT ĐẦU TEST ĐỒNG BỘ THU CHI SANG GOOGLE SHEETS ===');

  const mockCashbookData = [
    {
      stt: '1',
      shiftCode: '#TILJ4',
      employee: 'thungan@phincoffee.com',
      datetime: '20/09/2026 11:36',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: '2kg xoài',
      amount: '- 80,000 đ'
    },
    {
      stt: '2',
      shiftCode: '#TILJ4',
      employee: 'thungan@phincoffee.com',
      datetime: '20/09/2026 11:13',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: '2kg cam',
      amount: '- 40,000 đ'
    },
    {
      stt: '3',
      shiftCode: '#TPMXX',
      employee: 'thungan@phincoffee.com',
      datetime: '19/09/2026 17:51',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: 'đá',
      amount: '- 50,000 đ'
    }
  ];

  const result = await syncCashbookToGoogleSheets(mockCashbookData);
  logger.info(`KẾT QUẢ TEST: ${JSON.stringify(result)}`);
}

testCashbookSync();
