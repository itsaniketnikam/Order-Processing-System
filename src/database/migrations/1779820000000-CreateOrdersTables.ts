import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTables1779820000000 implements MigrationInterface {
  name = 'CreateOrdersTables1779820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres enum type backing Order.status
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM (
        'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING',
        "total_amount" numeric(10,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_customer_id" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id") ON UPDATE NO ACTION ON DELETE RESTRICT
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_name" character varying(255) NOT NULL,
        "quantity" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON UPDATE NO ACTION ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_customer_id"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
  }
}
