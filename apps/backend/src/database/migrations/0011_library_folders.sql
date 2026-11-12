CREATE UNIQUE INDEX "lists_user_name_unique" ON "lists" USING btree ("user_id",lower("name")) WHERE "lists"."user_id" is not null;
