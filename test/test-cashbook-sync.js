const { syncCashbookToGoogleSheets } = require('../services/sheetsSync');
const logger = require('../utils/logger');

async function testMasterCashbookSync() {
  logger.info('=== BẮT ĐẦU TEST ĐỒNG BỘ THU CHI VÀO SHEET MASTER ===');

  const mockCashbookData = [
    {
      stt: '1',
      shiftCode: '#TILJ4',
      employee: 'thungan@phincoffee.com',
      datetime: '21/09/2026 11:36',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: '12 hộp sữa tươi',
      amount: '- 348,000 đ'
    },
    {
      stt: '2',
      shiftCode: '#TILJ4',
      employee: 'thungan@phincoffee.com',
      datetime: '21/09/2026 11:13',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: '20 rich lùn',
      amount: '- 600,000 đ'
    },
    {
      stt: '3',
      shiftCode: '#TPMXX',
      employee: 'thungan@phincoffee.com',
      datetime: '21/09/2026 17:51',
      type: 'Chi',
      category: 'Chi phí nguyên liệu phụ',
      paymentMethod: 'CASH',
      note: 'bao rác 3 cuộn',
      amount: '- 45,000 đ'
    }
  ];

  const result = await syncCashbookToGoogleSheets(mockCashbookData);
  logger.info(`KẾT QUẢ TEST MASTER SHEET: ${JSON.stringify(result)}`);
}

testMasterCashbookSync();
