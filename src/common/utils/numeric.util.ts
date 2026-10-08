import type { Numeric } from '@prisma/orm-postgres/target/codec-types'

export type Money = Numeric<10, 2>

export function toMoney(value: string): Money {
    return value as Money
}

// Money math in integer cents; input must be a DTO- or DB-validated string like "12.50"
export function moneyToCents(value: string): number {
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

export function centsToMoneyString(cents: number): string {
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}