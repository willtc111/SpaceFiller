

var elem = $("#drawingArea")[0];
var windowSize = 500;
var params = {width: windowSize, height: windowSize};
var two = new Two(params).appendTo(elem);

var dimensionDisplay = $("#dimensions");
var slider = $("#dimensionSlider");
dimensionDisplay.text(slider.val());
slider.change(function() {
    dimensionDisplay.text(slider.val());
});

var chain = [];
var numLinks = 0;
var gridSize = 0;
var gridSquareSize = 0;
var halfGridSqSize = 0;
var genButton = $("#generateContainer");
genButton.click(function() {
    gridSize = Number(slider.val());
    gridSquareSize = windowSize/gridSize;
    halfGridSqSize = gridSquareSize / 2;
    numLinks = gridSize*gridSize;
    two.clear();
    drawGrid();
    var centOffset = gridSquareSize/2;
    
    var start = {x: centOffset, y: centOffset};
    if (gridSize % 2 == 0) {
        var finish = {x: centOffset, y: windowSize - centOffset}
    } else {
        var finish = {x: windowSize - centOffset, y: windowSize - centOffset}
    }
    chain = generateChain(start, finish, numLinks);
    two.update();
});


var stepButton = $("#stepContainer");
var stepper;
stepButton.click(function() {
    stepButton.prop("disabled", true);
    if (stepper) {
        clearInterval(stepper);
        stepper=undefined;
        stepButton.find("#stepButtonText").text("Start");
    } else {
        stepper = setInterval(function(){
            applyForces();
            updateDrawing();
        
            calculateForces();
            updateDrawing();
        }, 5);
        stepButton.find("#stepButtonText").text("Stop");
    }
    stepButton.prop("disabled", false);
});

function calculateForces(useNeighbor=true) {
    let neighborMult = Number($("#neighborWeightSlider").val());
    let otherMult = Number($("#otherWeightSlider").val());
    let unkinkMult = Number($("#unkinkWeightSlider").val());
    let momentum = Number($("#momentumSlider").val());

    // For all non-endpoint links of the chain
    for (let i = 1; i < chain.length-1; i++) {
        let curLink = chain[i];
        curLink.forceVec =  {
            x: curLink.forceVec.x*momentum,
            y: curLink.forceVec.y*momentum,
        };
        // Apply forces on each link.
        // Positive forces mean pulling, negative are pushing

        // Walls push away when close
        // Top wall
        let top = -1 * Math.min(0, Math.log(curLink.y/halfGridSqSize));
        // Bottom wall
        let bottom = Math.min(0, 1 * Math.log((windowSize-curLink.y)/halfGridSqSize));
        curLink.forceVec.y += (top + bottom) * halfGridSqSize;

        // Left wall
        let left = -1 * Math.min(0, 1 * Math.log(curLink.x/halfGridSqSize));
        // Right wall
        let right = Math.min(0, 1 * Math.log((windowSize-curLink.x)/halfGridSqSize));
        curLink.forceVec.x += (left + right) * halfGridSqSize;

        //All other links influence its position a little bit
        for (let j = 0; j < chain.length; j++) {
            let otherLink = chain[j];
            let dist = getDistance(chain[i], chain[j]);
            let vec = divVector(getVector(chain[i], chain[j]), dist);
            let force = 0;
            if (j == i) {
                // Ignore self influence
                continue;
            } else  if (Math.abs(j - i) == 1 && neighborMult > 0) {
                // Neighbors pull when far and push when close
                force = Math.log(dist/gridSquareSize) * neighborMult;
            } else {
                // All others just push
                force = -1 * Math.max(0, 1-(dist/gridSquareSize)) * otherMult;
            }
            force = force * Math.sqrt(gridSquareSize);
            vec = mulVector(vec, force);
            // Add to link's total force vector
            curLink.forceVec.x += vec.x;
            curLink.forceVec.y += vec.y;
        }

        // Unkinking acute angles
        let angle = angleBetween(chain[i-1], curLink, chain[i+1]);
        let midpoint = midpointOf(chain[i-1], chain[i+1]);
        let vec = divVector(getVector(curLink, midpoint), getDistance(curLink, midpoint));
        let force = (45 - Math.abs(45 - angle%90))/45;
        force = force * Math.sqrt(gridSquareSize) * unkinkMult;
        if (angle > 90 && angle < 270) {
            force = force * -1;
        }
        vec = mulVector(vec, force);

        // Add to link's total force vector
        curLink.forceVec.x += vec.x;
        curLink.forceVec.y += vec.y;
    }
}

function midpointOf(a,b) {
    return {
        x: (b.x-a.x)/2 + a.x,
        y: (b.y-a.y)/2 + a.y,
    }
}

function angleBetween(a,b,c) {
    let first = angleOf(b, a);
    let secnd = angleOf(b, c);
    return 360 - first + secnd;
}
function angleOf(from, to) {
    let dy = from.y - to.y;
    let dx = to.x - from.x;
    let res = Math.atan2(dy, dx);
    return res * (180/Math.PI);
}

function applyForces() {
    for (let i = 1; i < chain.length-1; i++) {
        let curLink = chain[i];
        curLink.x = Math.min(Math.max(curLink.x + curLink.forceVec.x, 1), windowSize-1);
        curLink.y = Math.min(Math.max(curLink.y + curLink.forceVec.y, 1), windowSize-1);
    }
}

function getVector(a, b) {
    return {
        x: b.x - a.x,
        y: b.y - a.y,
    }
}

function divVector(v, s) {
    v.x = v.x/s;
    v.y = v.y/s;
    return v;
}

function mulVector(v, s) {
    v.x = v.x * s;
    v.y = v.y * s;
    return v;
}

function getDistance(a, b) {
    // Manhattan Distance!
    // return Math.abs(a.x - b.x)
    //     + Math.abs(a.y - b.y);
    
    // Euclidean Distance!
    // let dx = b.x-a.x;
    // let dy = b.y-a.y;
    // return Math.sqrt(dx*dx + dy*dy);

    // Max distance???
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function generateChain(start, end, count) {
    var c = [];
    var xRange = end.x - start.x;
    var yRange = end.y - start.y;
    for(let i = 0; i < count; i++) {
        var ratio = i/(count-1);
        var r = Math.random();
        c.push({
            x: xRange * ratio + start.x + 5*(0.5 - r),
            y: yRange * ratio + start.y + 5*(0.5 - (1-r)),
            forceVec: {x: 0, y: 0},
        })
    }
    drawChain(c)
    return c;
}

function drawChain(c) {
    for (let i = 1; i < c.length; i++) {
        let edge = drawEdge(c[i-1], c[i]);
        c[i-1].outEdge = edge;
        c[i].inEdge = edge;
    }
    for (let i = 0; i < c.length; i++) {
        c[i].node = drawNode(c[i]);
        c[i].forceLine = drawForce(c[i]);
    }
}

function drawEdge(node1, node2) {
    var line = two.makeLine(node1.x, node1.y, node2.x, node2.y);
    line.linewidth = 2;
    return line;
}

function drawNode(node, color="blue") {
    var circle = two.makeCircle(node.x, node.y, 3);
    circle.fill = color;
    circle.stroke = color;
    circle.linewidth = 1;
    return circle;
}

function drawForce(node, show=true) {
    var line = two.makeLine(node.x, node.y, 
        node.forceVec.x + node.x, node.forceVec.y + node.y);
    line.stroke = "#ff7777";
    if (show) {
        line.opacity = 1;
    } else {
        line.opacity = 0;
    }
    return line;
}

function updateDrawing(doUpdate=true) {
    for (link of chain) {
        let x = link.x
        let y = link.y
        link.node.position.x = x;
        link.node.position.y = y;
        if (link.inEdge != undefined) {
            link.inEdge.vertices[1].x = x;
            link.inEdge.vertices[1].y = y;
        }
        if (link.outEdge != undefined) {
            link.outEdge.vertices[0].x = x;
            link.outEdge.vertices[0].y = y;
        }
        if (link.forceVec.x == 0 && link.forceVec.y == 0) {
            link.forceLine.opacity = 0;
        } else {
            link.forceLine.opacity = 1;
            link.forceLine.vertices[0].x = x;
            link.forceLine.vertices[0].y = y;
            link.forceLine.vertices[1].x = x + link.forceVec.x;
            link.forceLine.vertices[1].y = y + link.forceVec.y;
        }
    }
    if (doUpdate) {
        two.update();
    }
}

function drawGrid() {
    for (let i = 0; i <= gridSize; i++) {
        var ratio = i / gridSize;
        var pos = ratio * windowSize;
        // Horizontal line
        var line = two.makeLine(0, pos, windowSize, pos);
        line.stroke = "#bbbbbb";
        // Vertical line
        line = two.makeLine(pos, 0, pos, windowSize);
        line.stroke = "#bbbbbb";
    }
}
