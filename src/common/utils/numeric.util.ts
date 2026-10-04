import type { Numeric } from '@prisma/orm-postgres/target/codec-types'

export type Money = Numeric<10, 2>

export function toMoney(value: string): Money {
    return value as Money
}