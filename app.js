const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(8080, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const priorityList = ["HIGH", "MEDIUM", "LOW"];
const statusList = ["TO DO", "INPROGRESS", "DONE"];
const categoryList = ["WORK", "HOME", "LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const changeFormat = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodoQuery = "";
  let getTodoEle = "";
  console.log(await database.all(`select * from todo`));
  const {
    search_q = "",
    category = "",
    priority = "",
    status = "",
  } = request.query;
  console.log(search_q, category, priority, status);
  console.log(await database.all(`select * from todo`));
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE priority = '${priority}';`;
      getTodoEle = "Priority";
      break;
    case hasStatusProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE status like '${status}';`;
      getTodoEle = "Status";
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND category = '${category}'`;
      break;
    case hasCategoryProperty(request.query):
      getTodoQuery = `select * from todo where category = '${category}'`;
      getTodoEle = "Category";
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE category = '${category}' AND priority = '${priority}'`;
      break;
    default:
      getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
  }

  result = await database.all(getTodoQuery);
  if (result.length === 0) {
    response.status(400);
    response.send(`Invalid Todo ${getTodoEle}`);
  } else {
    reqInfo = result.map((data) => {
      return changeFormat(data);
    });
    response.send(reqInfo);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(changeFormat(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  let dateList = date.split("-");
  year = parseInt(dateList[0]);
  month = parseInt(dateList[1]) - 1;
  day = parseInt(dateList[2]);
  const formattedDate = format(new Date(year, month, day), "yyyy-MM-dd");
  //   const checkQuery = await database.all(`
  //       SELECT
  //         *
  //       FROM
  //         todo
  //       WHERE
  //         due_date = '${date}';`);
  if (isValid(new Date(date))) {
    const getTodoQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        due_date = '${formattedDate}';`;
    const todo = await database.all(getTodoQuery);
    reqInfo = todo.map((data) => {
      return changeFormat(data);
    });
    response.send(reqInfo);
  } else {
    response.status(400);
    response.send(`Invalid Due Date`);
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let invalidError = null;
  switch (true) {
    case !statusList.includes(status):
      invalidError = "Invalid Todo Status";
      break;
    case !priorityList.includes(priority):
      invalidError = "Invalid Todo Priority";
      break;
    case !categoryList.includes(category):
      invalidError = "Invalid Todo Category";
      break;
    case !isValid(new Date(dueDate)):
      invalidError = "Invalid Due Date";
      break;
  }
  if (invalidError !== null) {
    response.status(400);
    response.send(invalidError);
  } else {
    const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${dueDate}');`;
    const todoAdded = await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updatedColumn = null;
  const requestBody = request.body;

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      invalidError = !statusList.includes(status)
        ? "Invalid Todo Status"
        : null;
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      invalidError = !priorityList.includes(priority)
        ? "Invalid Todo Priority"
        : null;
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      invalidError = !categoryList.includes(category)
        ? "Invalid Todo Category"
        : null;
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      invalidError = !isValid(new Date(dueDate)) ? "Invalid Due Date" : null;
      break;
  }

  if (invalidError !== null) {
    response.status(400);
    response.send(invalidError);
  } else {
    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}',
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`;
    const updatedTodo = await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
