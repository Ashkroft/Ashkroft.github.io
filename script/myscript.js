var VERTEX_RADIUS = 15; //радиус вершины
var INTERVAL = 10; //интервал обновления анимации
var ARROW_SPEED = 0.1; //скорость стрелки
var COLOR_SPEED = 0.2; //скорость изменения цвета вершины
var QUEUE_SPEED = 0.05; //скорость движения очереди
var COLOR_CONST = 240; // начальный тон вершины (синий) и конечный (красный)
var VERTEX_COLOR = "#FAEBD7"; //цвет вершины
var GRAPH_COLOR = "#000000"; //цвет графа
var ARROW_COLOR = "#0000f0"; // цвет ориентированных рёбер
var TEXT_COLOR = "#000000"; //цвет текста
var BACKGROUND_COLOR = "#F5FFFA"; //цвет фона
var TEXT_FONT = "Times New Roman";
/*размеры ячейки в очереди*/
var RV_LEFT = 45;
var RV_TOP = 12;
var ANS_BOLD = 30;// размер ячейки для поля ответов
var ANS_LEFT = 100; //отступ для поля с ответами
//отступы для очереди
var QUEUE_TOP = 100;
var QUEUE_RIGHT = 50;
/*для холста*/
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext('2d');
var factor = 1; //множитель для скорости


var isPause = false;
var isStarted = false;
var answer = []; //кратчайший путь
var vertices = [];//вершины
var edges = [];//ребра
var orientedEdges = [];//ребра для графа обхода
var queue = []; //контейнер - очередь
var actions = [], actionsInd = -1; // события

/*Создание вершин-окружностей
  x, y - координаты центра вершины, name - имя */
function Vertex(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.color = VERTEX_COLOR;
}

Vertex.prototype.display = function () {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.lineWidth = 2;
    ctx.arc(this.x, this.y, VERTEX_RADIUS, 0, 2 * Math.PI, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, VERTEX_RADIUS, 0, 2 * Math.PI, true);
    ctx.strokeStyle = GRAPH_COLOR;
    ctx.stroke();
    displayText(this.name, this.x, this.y)
};

/*Создание ребер
  begin, end - начало и конец ребра */
function Edge(begin, end) {
    this.begin = begin;
    this.end = end;
}

Edge.prototype.display = function () {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = GRAPH_COLOR;
    ctx.moveTo(this.begin.x, this.begin.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
};

/*ориентированные ребра для графа обхода
  принимает begin, end - начало и конец ребра */
function OrientedEdge() {
    Edge.apply(this, arguments);
    this.length = VERTEX_RADIUS
}

OrientedEdge.prototype.display = function () {
    var LENGTH = 15, ANGLE_OF_ARROW = Math.PI / 6;

    var aLeft, aRight, aBegin;
    var angle = Math.atan2(this.begin.x - this.end.x, this.begin.y - this.end.y);

    aBegin = this.getArrow();
    aLeft = {
        x: aBegin.x + LENGTH * Math.sin(angle + ANGLE_OF_ARROW),
        y: aBegin.y + LENGTH * Math.cos(angle + ANGLE_OF_ARROW)
    };
    aRight = {
        x: aBegin.x + LENGTH * Math.sin(angle - ANGLE_OF_ARROW),
        y: aBegin.y + LENGTH * Math.cos(angle - ANGLE_OF_ARROW)
    };

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ARROW_COLOR;
    ctx.moveTo(this.begin.x, this.begin.y);
    ctx.lineTo(aBegin.x, aBegin.y);
    ctx.moveTo(aLeft.x, aLeft.y);
    ctx.lineTo(aBegin.x, aBegin.y);
    ctx.lineTo(aRight.x, aRight.y);
    ctx.stroke();
};

OrientedEdge.prototype.getArrow = function () {
    var angle = Math.atan2(this.begin.x - this.end.x, this.begin.y - this.end.y);
    return {x: this.begin.x - this.length * Math.sin(angle), y: this.begin.y - this.length * Math.cos(angle)};
};

/*класс для вершин в очереди
  принимает x, y - координаты центра вершины, name - имя*/ 
function RectVertex() {
    Vertex.apply(this, arguments);
}

RectVertex.prototype.display = function () {
    ctx.fillStyle = VERTEX_COLOR;
    ctx.fillRect(this.x - RV_LEFT, this.y - RV_TOP, RV_LEFT * 2, RV_TOP * 2);
    ctx.strokeStyle = GRAPH_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - RV_LEFT, this.y - RV_TOP, RV_LEFT * 2, RV_TOP * 2);
    displayText(this.name, this.x, this.y);
};

//функция отображающая text по координатам x, y 
function displayText(text, x, y) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = TEXT_FONT;
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(text, x, y);
}

/*Рассчитываем расстояние
  x1, y1, x2, y2 - кооринаты двух точек*/ 
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

/*проверяет находится ли точка в вершине или нет
  x, y - координаты точки, v - вершина */
function isPointInVertex(x, y, v) {
    return distance(x, y, v.x, v.y) <= VERTEX_RADIUS;
}

/*Подождун для нового действия*/
function nextAction() {
    var TIMEOUT = 100;
    var oldTime = Date.now(), time = oldTime;
    var timer = setInterval(function () {
        if (time - oldTime >= TIMEOUT) {
            clearInterval(timer);
            actions[++actionsInd].doIt();
        }
        time += INTERVAL * factor;
    }, INTERVAL);
}

/*при вызове отображает все элементы*/
function displayElements() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    [edges, orientedEdges, vertices, queue].forEach(function (w) {
        w.forEach(function display(q) {
            q.display();
        });
    });
    displayAns();
}

/*отображает таблицу ответов:первая строка - вершины, вторая - дистанции
 Вначале все дистанции - бесконечность*/
function displayAns() {
    ctx.clearRect(ANS_LEFT, canvas.height - ANS_BOLD * 2, ANS_BOLD * answer.length, ANS_BOLD * 2);
    ctx.fillStyle = VERTEX_COLOR;
    ctx.fillRect(ANS_LEFT, canvas.height - ANS_BOLD * 2, ANS_BOLD * answer.length, ANS_BOLD * 2);
    answer.forEach(function (a, j) {
        var y = canvas.height - ANS_BOLD;
        var x = ANS_LEFT + ANS_BOLD * j;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, ANS_BOLD, ANS_BOLD);
        ctx.strokeRect(x, y - ANS_BOLD, ANS_BOLD, ANS_BOLD);
        displayText(j, x + 0.5 * ANS_BOLD, y - 0.5 * ANS_BOLD);
        var mes = answer[j] === Infinity ? 'inf' : answer[j];
        displayText(mes, x + 0.5 * ANS_BOLD, y + 0.5 * ANS_BOLD);
    })
}

/*Изменение цветов вершин при обходе графа в ширину
 Синяя вершина - вершина, помещенная в очередь
 Красная вершина - вершина, извлеченная из очереди (просмотренная)
 vertex - вершина, цвет которой будет меняться*/
function ColorChange(vertex) {
    this.vertex = vertex;
}

ColorChange.prototype.doIt = function () {
    var r = 0, b = COLOR_CONST;
    this.vertex.color = "rgb(" + r + ",0," + b + ")";
    var v = this.vertex;
    var animation = setInterval(function () {
        if (!isStarted) {
            clearInterval(animation);
            return;
        }
        if (r >= COLOR_CONST) {
            clearInterval(animation);
            nextAction();
            return;
        }
        r += factor * COLOR_SPEED * INTERVAL;
        r = Math.min(255, r);
        b = Math.max(COLOR_CONST - r, 0);
        v.color = "rgb(" + r + ",0," + b + ")";
        displayElements();
    }, INTERVAL)
};

/*Реализуем движение стрелки между вершинами
  arrow - ориентированное ребро (OrientedEdge)*/
function MovingArrow(arrow) {
    this.arrow = arrow
}

MovingArrow.prototype.doIt = function () {
    var a = this.arrow;
    orientedEdges.push(a);
    displayElements();
    var animation = setInterval(function () {
        if (!isStarted) {
            clearInterval(animation);
            return;
        }
        if (isPointInVertex(a.getArrow().x, a.getArrow().y, a.end)) {
            clearInterval(animation);
            a.end.color = ARROW_COLOR;
            answer[a.end.name] = answer[a.begin.name] + 1;
            queue.push(new RectVertex(canvas.width - QUEUE_RIGHT - RV_LEFT,
                QUEUE_TOP + 2 * (queue.length + 0.5) * RV_TOP, a.end.name));
            displayElements();
            nextAction();
            return;
        }
        a.length += factor * ARROW_SPEED * INTERVAL;
        displayElements();
    }, INTERVAL)
};

/*Реализуем продвижение очереди на холсте*/
function MovingQueue() {
}

MovingQueue.prototype.doIt = function () {
    queue.shift();
    displayElements();
    var animation = setInterval(function () {
        if (!isStarted) {
            clearInterval(animation);
            return;
        }
        if (queue.length === 0 || queue[0].y <= QUEUE_TOP + RV_TOP) {
            clearInterval(animation);
            nextAction();
            return;
        }
        queue.forEach(function (rv) {
            rv.y -= QUEUE_SPEED * INTERVAL * factor
        });
        displayElements();
    }, INTERVAL);
};

/*Алгоритм обхода графа в ширину*/
function bfs() {
    answer[0] = 0;
    isStarted = true;
    var q = [];
    q.push(vertices[0]);
    var dist = (new Array(vertices.length)).fill(Infinity);
    dist[0] = 0;
    vertices[0].color = ARROW_COLOR;
    displayElements();
    while (q.length > 0) {
        actions.push(new MovingQueue());
        var b = q.shift(), e;
        for (var i in edges) {
            if (edges[i].end === b || edges[i].begin === b) {
                e = vertices[edges[i].end.name ^ edges[i].begin.name ^ b.name];
                if (dist[e.name] === Infinity) {
                    actions.push(new MovingArrow(new OrientedEdge(b, e)));
                    q.push(vertices[e.name]);
                    dist[e.name] = dist[b.name] + 1;
                }
            }
        }
        actions.push(new ColorChange(b));
    }
    nextAction();
}

/*Кнопки-управления обхода графа*/
var buttonPause = document.getElementById("pause");
var buttonStart = document.getElementById("start");
var buttonStop = document.getElementById("stop");
var inputSpeed = document.getElementById("speed_factor");

inputSpeed.oninput = setSpeed;
function setSpeed() {
    if (isPause) {
        factor = 0;
        return;
    }
    var val = inputSpeed.value;
    factor = Math.pow(2, val);
}

buttonPause.onclick = function () {
    buttonPause.src = "images/pause2.png";
    buttonStart.disabled = false;
    buttonStart.src = "images/start1.png";
    isPause = true;
    setSpeed();
};

buttonStart.onclick = function () {
    buttonStart.src = "images/start2.png";
    buttonPause.src = "images/pause1.png";
    buttonPause.disabled = false;
    buttonStart.disabled = true;
    if (isPause)
        isPause = !isPause;
    else {
        bfs();
	}
    setSpeed();
};

buttonStop.onclick = function () {
    isStarted = false;
  //  setDisabled(false);
    answer.fill(Infinity);
    buttonStop.src = "images/stop2.png";
    buttonStart.src = "images/start1.png";
    buttonStart.disabled = false;
    buttonPause.disabled = true;
    buttonPause.src = "images/pause1.png";
    isPause = false;
    orientedEdges = [];
    queue = [];
    vertices.forEach(function (v) {
        v.color = VERTEX_COLOR;
    });
    displayElements();
    actions = [];
    actionsInd = -1;
    buttonStop.src = "images/stop1.png"
};

/*Кнопки - конструкторы вершин графа*/

document.getElementById("delete_vertex").onclick = function () {
    vertices.pop();
    answer.pop();
    edges = edges.filter(function (e) {
        return e.begin.name !== vertices.length && e.end.name !== vertices.length;
    });
    displayElements();
};

document.getElementById("clear_vertices").onclick = function () {
    vertices = [];
    answer = [];
    edges = [];
    displayElements();
};
/*Кнопки - конструкторы ребер графа*/

document.getElementById("delete_edge").onclick = function () {
    edges.pop();
    displayElements();
};

document.getElementById("clear_edges").onclick = function () {
    edges = [];
    displayElements();
};

/*Узнаем позицию мыши на холсте*/
function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function getVertex(a) {
    for (var i in vertices) {
        if (distance(a.x, a.y, vertices[i].x, vertices[i].y) <= VERTEX_RADIUS)
            return vertices[i];
    }
    return null;
}

function isEdge(begin, end) {
    for (var i in edges) {
        if (begin === edges[i].begin && end === edges[i].end ||
            begin === edges[i].end && end === edges[i].begin)
            return true;
    }
    return false;
}

/*рисуем граф*/
var newEdgeBegin;
canvas.addEventListener("click", function (evt) {
    var a = getMousePos(evt);
		var flag = a;
        a = getVertex(a);
        if (a !== null) {
            if (newEdgeBegin === undefined)
                newEdgeBegin = a;
            else {
                if (a === newEdgeBegin) {
                    alert("Петля. Ребро не добавлено");
                } else if (isEdge(newEdgeBegin, a)) {
                    alert("Кратное ребро. Ребро не добавлено");
                } else {
                    edges.push(new Edge(newEdgeBegin, a));
                    displayElements();
                }
                newEdgeBegin = undefined;
            }
        }
		else 
		{
			vertices.push(new Vertex(flag.x, flag.y, vertices.length));
			answer.push(Infinity);
			displayElements();
			return;
        }
});