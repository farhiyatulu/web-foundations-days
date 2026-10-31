# Library API Design

Resource: **books** (a plural noun).

Each book has these fields: `id`, `title`, `author`, `year`, `available`.

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Success status:** 200 OK

### 2. Get one book

- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the book with the given id.
- **Success status:** 200 OK

### 3. Create a book

- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**
  `{ "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958 }`
- **Success status:** 201 Created

### 4. Replace a book

- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the whole book with a new version.
- **Example request body:**
  `{ "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958, "available": true }`
- **Success status:** 200 OK

### 5. Update part of a book

- **Method:** PATCH
- **Path:** `/books/{id}`
- **Description:** Changes only the fields that are sent, such as availability.
- **Example request body:**
  `{ "available": false }`
- **Success status:** 200 OK

### 6. Delete a book

- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book from the library.
- **Success status:** 204 No Content

### 7. List books by an author

- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Success status:** 200 OK

## Error codes

- **400 Bad Request**
  - Happens when the request is invalid.
  - Example: `POST /books` with an empty `title`, or with `year` set to `"abc"`.
- **404 Not Found**
  - Happens when the book or URL does not exist.
  - Example: `GET /books/9999` when no book has the id 9999.
