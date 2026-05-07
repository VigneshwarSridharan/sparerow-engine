import { assertPositiveInt, assertSafeMinorAmount, lineTotal } from '../../../../lib/validators';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    const qty = assertPositiveInt('quantity', data.quantity);
    const unit = assertSafeMinorAmount('unitPriceInMinor', data.unitPriceInMinor);
    const lt = lineTotal(unit, qty);
    if (data.lineTotalInMinor != null) {
      const provided = assertSafeMinorAmount('lineTotalInMinor', data.lineTotalInMinor);
      if (provided !== lt) throw new Error('LINE_TOTAL_MISMATCH');
    } else {
      data.lineTotalInMinor = lt.toString();
    }
  },
};
