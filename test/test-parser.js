const { parseCurrency, formatDate, determineShift, normalizeShiftData } = require('../utils/parser');

console.log('=== KIỂM THỬ MODULE PARSER ===');

// 1. Test parseCurrency
const testAmounts = [
  '374,000 đ',
  '1,250,000 VNĐ',
  '890.500đ',
  ' - 50,000 đ',
  '0 đ',
  150000
];

console.log('\n--- Test làm sạch tiền tệ ---');
testAmounts.forEach(amt => {
  console.log(`Gốc: "${amt}" => Đã parse: ${parseCurrency(amt)} (Kiểu: ${typeof parseCurrency(amt)})`);
});

// 2. Test determineShift
console.log('\n--- Test xác định Ca ---');
console.log('07:30 (Không có tên ca) =>', determineShift('07:30'));
console.log('15:00 (Không có tên ca) =>', determineShift('15:00'));
console.log('23:00 (Không có tên ca) =>', determineShift('23:00'));
console.log('08:00 (Tên ca: Ca Sáng) =>', determineShift('08:00', 'Ca Sáng'));

// 3. Test normalizeShiftData
console.log('\n--- Test chuẩn hóa mảng dữ liệu ---');
const rawRows = [
  { shiftName: 'Ca 1', openTime: '07:00 20/09/2026', closeTime: '14:00 20/09/2026', netRevenue: '374,000 đ' },
  { shiftName: 'Ca 2', openTime: '14:00 20/09/2026', closeTime: '22:00 20/09/2026', netRevenue: '1,250,000 VNĐ' }
];

const normalized = normalizeShiftData(rawRows);
console.log(JSON.stringify(normalized, null, 2));

console.log('\n✅ Tất cả bài kiểm thử Parser hoàn thành thành công!');
