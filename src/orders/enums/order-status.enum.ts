/**
 * Canonical lifecycle states for a customer order. String values are stored
 * verbatim in Postgres via a dedicated enum type (orders_status_enum).
 *
 *   PENDING    - just created, awaiting confirmation / payment
 *   PROCESSING - being prepared / packed
 *   SHIPPED    - handed to the carrier
 *   DELIVERED  - received by the customer (terminal state)
 *   CANCELLED  - cancelled by the customer or system (terminal state)
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
