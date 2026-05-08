import { SLUG_REGEX } from '../../../../lib/validators';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.slug) {
      data.slug = String(data.slug).trim().toLowerCase();
      if (!SLUG_REGEX.test(data.slug as string)) throw new Error('INVALID_SLUG');
    }
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.slug) {
      data.slug = String(data.slug).trim().toLowerCase();
      if (!SLUG_REGEX.test(data.slug as string)) throw new Error('INVALID_SLUG');
    }
  },
};
