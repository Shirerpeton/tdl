drop database tdl;
create database tdl;

\connect tdl;

create table "users" (
"username" varchar(20), 
"passwordHash" char(60) not null, 
constraint "users_pk" primary key ("username"));