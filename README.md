# DATABASE DRIVER

Wraps common CRUD functionalities of MongoDB, MySQL, PostgreSQL and LocalStorage (Browser) to a single API, adding more consistency and using the power of <br>
the RxJS library.

Currently only supports MONGODB 4.2+

future support:

- LocalStorage
- MySQL
- PostgreSQL

## Stack

- NodeJS
- RxJS
- MongoDB
- MySQL
- LocalStorage (Browser)

## The purpose

This package exposes one class, `DatabaseDriver`. This is the main module and has the goal to expose a common interface for
CRUD operations, regardless of the database client being used. Therefore, it is not needed to know how the MongoDB or MySQL node driver
works.
In addition to that, this driver is best used in simple web APIs due to its simplicity.

Another important point to mention is the usage of RxJS. Due to the async nature of CRUD operations in databases, those will probably
rely more on promises, which may cause some issues for development purposes, such as multiple callbacks with different function signatures, different
return types and callback chaining. Observables in RxJS provide a common interface to work with, where the callbacks will always respect
the same signatures. Due to this common interface (the brilliant idea behind RxJS), the developer has more freedom in how the observables
can be used. Finally, there is no callback chaining (or callback hell), which is another plus.

## Installation

`npm install --save @andrelas1/db-driver`

## Requirements

NodeJS: 10+ <br>
TypeScript: 3.7.2+ <br>
MongoDB: 4.2.1+

## How to use

### Setup your Database

- MongoDB: MongoDB LTS has to be up and running.
- Browser's localStorage: TBD.
- MySQL: TBD.
- PostgreSQL: TBD.

### Instantiate the dbDriver object

```typescript
import { DatabaseDriver } from '@andrelas1/db-driver';

const dbDriver = new DatabaseDriver(
    'mongodb', // database type -> 'mongodb' | 'localStorage' | 'mysql' | 'postgresql'
    {
        url: 'mongodb://localhost:27017' // db url
        username?: 'db-login-username', // username
        password?: '**\*\***' // password
    },
    options // usually, db clients exposes a config object. Since this still only supports mongo, this is equivalent to the MongoClientOptions
);
```

3.  Execute CRUD operations

Every CRUD operation returns an observable of the updated collection. The collection is the list of items. Moreover, for better experience, the CRUD method can get a type via TS generics, just like the following:

- write data to the db

```typescript
dbDriver
  .insert<{ foo: string }>("mydbname", "mycollection", { foo: "bar" })
  .pipe(
    catchError(err => {
      //handle error
      return of([]);
    })
  )
  .subscribe((col: Array<{ foo: string }>) => {
    // do something
  });
```

It is also possible to provide a list of objects, such as:

```typescript
dbDriver.insert<MyItemType>("mydbname", "mycollection", [
  { foo: "bar" },
  { foo: "foobar" }
]);
```

- read data from the db

```typescript
dbDriver.read<MyItemType>('mydbname', 'mycollection')
    .pipe(
        catchError(err => {
            // handle error
            return of([]);
        })
    )
    .subscribe((col: Array<{foo: string}>) => { // do something })
```

- delete data from the db

```typescript
dbDriver.delete<MyItemType>('mydbname', 'mycollection', { foo: 'bar' })
    .pipe(
        catchError(err => {
            // handle error
            return of([]);
        })
    )
    .subscribe((col: Array<{foo: string}>) => { // do something })
```

Delete can only receive one object.

- delete all data from the db

```typescript
dbDriver
  .deleteAll("mydbname", "mycollection")
  .pipe(
    catchError(err => {
      // handle error
      return of([]);
    })
  )
  .subscribe((col: any[]) => {
    // do something
  });
```

- update data from the db

```typescript
dbDriver
  .update<MyItemType>(
    "mydbname",
    "mycollection",
    { foo: "bar" },
    { foo: "foobar" }
  )
  .pipe(
    catchError(err => {
      // handle error
      return of([]);
    })
  )
  .subscribe((col: Array<{ foo: string }>) => {
    // do something
  });
```

## License

MIT

## Contributions

TBD
