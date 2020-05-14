drop database tdl;
create database tdl;

\connect tdl;

create table "users" (
"username" varchar(20), 
"passwordHash" char(60) not null, 
constraint "users_pk" primary key ("username"));

create table "projects" (
"projectId" serial,
"projectName" varchar(256) not null,
constraint "projects_pk" primary key ("projectId"));

create table "usersProjects" (
"username" varchar(20),
"projectId" serial,
constraint "usersProjects_fk0" foreign key ("username") references "users"("username"),
constraint "usersProjects_fk1" foreign key ("projectId") references "projects"("projectId") on delete cascade);

create type priorityType as enum ('low', 'medium', 'high');

create table "tasks" (
"taskName" varchar(256) not null,
"taskId" serial,
"dateOfAdding" timestamp not null,
"priority" priorityType,
"projectId" serial,
"completed" boolean not null,
constraint "task_pk" primary key ("taskId"),
constraint "task_fk" foreign key ("projectId") references "projects"("projectId") on delete cascade);