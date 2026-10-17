const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const keypad = document.getElementById("keypad");
const angleModeButton = document.getElementById("angle-mode");

let expression = "";
let answer = 0;
let angleMode = "DEG";

function updateDisplay() {
  expressionDisplay.textContent = expression || "Listo para calcular";
  resultDisplay.textContent = expression ? resultDisplay.textContent : "0";
}

function insert(value) {
  if (resultDisplay.textContent === "Error" && value !== "AC") {
    expression = "";
    resultDisplay.textContent = "0";
  }
  expression += value;
  expressionDisplay.textContent = expression;
  if (!expression) resultDisplay.textContent = "0";
}

function clearAll() {
  expression = "";
  expressionDisplay.textContent = "Listo para calcular";
  resultDisplay.textContent = "0";
}

function deleteLast() {
  expression = expression.slice(0, -1);
  expressionDisplay.textContent = expression || "Listo para calcular";
  if (!expression) resultDisplay.textContent = "0";
}

function toggleSign() {
  if (!expression) {
    expression = "-";
  } else if (expression.startsWith("-(") && expression.endsWith(")")) {
    expression = expression.slice(2, -1);
  } else {
    expression = `-(${expression})`;
  }
  expressionDisplay.textContent = expression;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) {
    throw new Error("Factorial no válido");
  }
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Convierte la expresión visible a una expresión matemática segura.
// No usa eval() ni ejecuta código introducido por el usuario.
function tokenize(input) {
  const source = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/\bAns\b/g, `(${answer})`);

  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) { i += whitespace[0].length; continue; }

    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[a-zA-Z]+/);
    if (identifier) {
      const name = identifier[0].toLowerCase();
      if (!["sin", "cos", "tan", "sqrt", "log", "ln", "pi", "e"].includes(name)) {
        throw new Error("Función desconocida");
      }
      tokens.push({ type: "name", value: name });
      i += identifier[0].length;
      continue;
    }

    const char = source[i];
    if ("+-*/^()!%".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      i++;
      continue;
    }
    throw new Error("Expresión no válida");
  }
  return tokens;
}

function calculate(input) {
  const tokens = tokenize(input);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      const op = take().value;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() && ["*", "/"].includes(peek().value)) {
      const op = take().value;
      const right = parseUnary();
      if (op === "/" && right === 0) throw new Error("No se puede dividir entre cero");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (peek() && peek().value === "+") { take(); return parseUnary(); }
    if (peek() && peek().value === "-") { take(); return -parseUnary(); }
    return parsePower();
  }

  function parsePower() {
    let value = parsePostfix();
    if (peek() && peek().value === "^") {
      take();
      value = Math.pow(value, parseUnary());
    }
    return value;
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() && ["!", "%"].includes(peek().value)) {
      const op = take().value;
      if (op === "!") value = factorial(value);
      else value /= 100;
    }
    return value;
  }

  function parsePrimary() {
    const token = take();
    if (!token) throw new Error("Falta un número");

    if (token.type === "number") return token.value;

    if (token.value === "(") {
      const value = parseExpression();
      if (!peek() || take().value !== ")") throw new Error("Falta cerrar paréntesis");
      return value;
    }

    if (token.type === "name") {
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;

      if (!peek() || take().value !== "(") throw new Error("Añade paréntesis a la función");
      const arg = parseExpression();
      if (!peek() || take().value !== ")") throw new Error("Falta cerrar paréntesis");

      const angle = angleMode === "DEG" ? arg * Math.PI / 180 : arg;
      switch (token.value) {
        case "sin": return Math.sin(angle);
        case "cos": return Math.cos(angle);
        case "tan":
          if (Math.abs(Math.cos(angle)) < 1e-12) throw new Error("Tangente no definida");
          return Math.tan(angle);
        case "sqrt":
          if (arg < 0) throw new Error("Raíz real de número negativo");
          return Math.sqrt(arg);
        case "log":
          if (arg <= 0) throw new Error("Logaritmo requiere un número positivo");
          return Math.log10(arg);
        case "ln":
          if (arg <= 0) throw new Error("Logaritmo requiere un número positivo");
          return Math.log(arg);
      }
    }
    throw new Error("Expresión no válida");
  }

  if (!tokens.length) throw new Error("Escribe una operación");
  const value = parseExpression();
  if (position !== tokens.length) throw new Error("Revisa la expresión");
  if (!Number.isFinite(value)) throw new Error("Resultado fuera de rango");
  return value;
}

function formatNumber(value) {
  if (Object.is(value, -0)) value = 0;
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return Number(value.toPrecision(10)).toString();
}

function solve() {
  if (!expression.trim()) return;
  try {
    const result = calculate(expression);
    answer = result;
    resultDisplay.textContent = formatNumber(result);
    expressionDisplay.textContent = `${expression} =`;
    expression = "";
  } catch (error) {
    resultDisplay.textContent = "Error";
    expressionDisplay.textContent = error.message || "Revisa la operación";
  }
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "clear") clearAll();
  else if (action === "delete") deleteLast();
  else if (action === "sign") toggleSign();
  else if (action === "equals") solve();
  else if (button.dataset.insert) insert(button.dataset.insert);
});

angleModeButton.addEventListener("click", () => {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleModeButton.textContent = angleMode;
  angleModeButton.title = angleMode === "DEG" ? "Ángulos en grados" : "Ángulos en radianes";
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const key = event.key;

  if (/^[0-9.]$/.test(key)) insert(key);
  else if (key === "+") insert("+");
  else if (key === "-") insert("−");
  else if (key === "*") insert("×");
  else if (key === "/") { event.preventDefault(); insert("÷"); }
  else if (key === "^") insert("^");
  else if (key === "(" || key === ")") insert(key);
  else if (key === "%") insert("%");
  else if (key === "Enter" || key === "=") { event.preventDefault(); solve(); }
  else if (key === "Backspace") deleteLast();
  else if (key === "Escape") clearAll();
});
