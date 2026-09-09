import { describe, expect, it } from 'vitest';

import {
  createServiceAttendanceSchema,
  createServiceLayoutSchema,
  createServiceSeatSchema,
  updateServiceAttendanceSchema,
  updateServiceLayoutSchema,
  updateServiceSeatSchema,
} from '@/lib/domain/services';

describe('Services Domain Schemas', () => {
  describe('createServiceLayoutSchema', () => {
    it('parses valid service layout input with defaults', () => {
      const parsed = createServiceLayoutSchema.parse({
        description: 'Main Sunday Service Layout',
      });

      expect(parsed.description).toBe('Main Sunday Service Layout');
      expect(parsed.is_active).toBe(true);
      expect(parsed.metadata).toEqual({});
    });

    it('rejects empty description', () => {
      const result = createServiceLayoutSchema.safeParse({
        description: '   ',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateServiceLayoutSchema', () => {
    it('allows partial updates', () => {
      const parsed = updateServiceLayoutSchema.parse({
        is_active: false,
      });

      expect(parsed.is_active).toBe(false);
      expect(parsed.description).toBeUndefined();
    });
  });

  describe('createServiceSeatSchema', () => {
    const validSeatInput = {
      layout_id: '123e4567-e89b-12d3-a456-426614174000',
      table_number: 'Table 1',
      area: 'Main Hall',
      seat_number: 'S-01',
    };

    it('parses valid service seat input', () => {
      const parsed = createServiceSeatSchema.parse(validSeatInput);

      expect(parsed.table_number).toBe('Table 1');
      expect(parsed.layout_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid layout_id uuid', () => {
      const result = createServiceSeatSchema.safeParse({
        ...validSeatInput,
        layout_id: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty table_number', () => {
      const result = createServiceSeatSchema.safeParse({
        ...validSeatInput,
        table_number: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateServiceSeatSchema', () => {
    it('accepts valid updates', () => {
      const parsed = updateServiceSeatSchema.parse({
        table_number: 'Table 5',
        area: 'Overflow',
      });

      expect(parsed.table_number).toBe('Table 5');
      expect(parsed.area).toBe('Overflow');
    });
  });

  describe('createServiceAttendanceSchema', () => {
    const validAttendanceInput = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      rfid: '1322107803',
      service_date: '2025-03-09',
      time_slot: '9AM',
      is_walk_in: false,
      is_override: false,
      is_manual_entry: false,
      service_seat_id: '987e6543-e89b-12d3-a456-426614174000',
    };

    it('parses valid service attendance input', () => {
      const parsed = createServiceAttendanceSchema.parse(validAttendanceInput);

      expect(parsed.user_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(parsed.rfid).toBe('1322107803');
      expect(parsed.service_date).toBe('2025-03-09');
      expect(parsed.time_slot).toBe('9AM');
      expect(parsed.is_walk_in).toBe(false);
    });

    it('rejects invalid service_date format', () => {
      const result = createServiceAttendanceSchema.safeParse({
        ...validAttendanceInput,
        service_date: '03-09-2025',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid user_id uuid', () => {
      const result = createServiceAttendanceSchema.safeParse({
        ...validAttendanceInput,
        user_id: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateServiceAttendanceSchema', () => {
    it('accepts valid attendance updates', () => {
      const parsed = updateServiceAttendanceSchema.parse({
        time_slot: '12NN',
        is_override: true,
      });

      expect(parsed.time_slot).toBe('12NN');
      expect(parsed.is_override).toBe(true);
    });
  });
});
