import { MigrationInterface, QueryRunner } from "typeorm";

export class init1672974427907 implements MigrationInterface {
    name = 'init1672974427907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."bank_hour_day_enum" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`);
        await queryRunner.query(`CREATE TABLE "bank_hour" ("id" SERIAL NOT NULL, "userId" character varying NOT NULL, "day" "public"."bank_hour_day_enum" NOT NULL, "hour" integer NOT NULL, CONSTRAINT "PK_e4f0bb9596fa3c66b3c81ea0a4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "instructions" ("id" character varying NOT NULL, "name" character varying NOT NULL, "canceled" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_1695991f6159e4ae33b136a67ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invite_simple" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "discordId" character varying NOT NULL, "alt" boolean, CONSTRAINT "PK_aae080d6a7a122487d8d6864508" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invite_simple"`);
        await queryRunner.query(`DROP TABLE "instructions"`);
        await queryRunner.query(`DROP TABLE "bank_hour"`);
        await queryRunner.query(`DROP TYPE "public"."bank_hour_day_enum"`);
    }

}
