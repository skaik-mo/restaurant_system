import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import {
    MENU_ITEM_MAX_PRICE,
    MENU_ITEM_PRICE_NONZERO_PATTERN,
    MENU_ITEM_PRICE_PATTERN,
} from '../menu-items.constants.js';

// Price is a decimal string, never a number. The pattern caps the integer digits (so max is MENU_ITEM_MAX_PRICE)
// and at most 2 decimals, so Postgres never has to round silently
export function IsMenuItemPrice() {
    return applyDecorators(
        IsString(),
        Matches(MENU_ITEM_PRICE_PATTERN, {
            message: `price must be a decimal string with at most 2 decimals and at most ${MENU_ITEM_MAX_PRICE}`,
        }),
        Matches(MENU_ITEM_PRICE_NONZERO_PATTERN, { message: 'price must be greater than 0' }),
    );
}