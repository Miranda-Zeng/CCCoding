let openai_api_proxy = "https://zest-quiet-phalange.glitch.me/";

let img_1;

let drawingLayer;
let canvas;

let colorPicker;
let brushSize = 10;
let sizeSlider;
let analyzeButton, clearButton;

let resultText = "";
let currentText = "";
let charIndex = 0;
let typingSpeed = 5;
let frameCounter = 0;

let shortResultText = ""; // For the image generation input

// ComfyUI-related variables
let workflow;
let comfy;
let resImg;
let showResultBackground = false;
let resultBackgroundColor;
function preload() {
  // img_1 = loadImage("1.jpg");
  let base64Image = localStorage.getItem("capturedHandImage");

  if (base64Image) {
    img_1 = loadImage(base64Image);
  } else {
    img_1 = loadImage("1.jpg");
  }

  workflow = loadJSON("workflow_api.json"); // Load ComfyUI workflow JSON
}

function setup() {
  canvas = createCanvas(1024,704);
  let realcanvas = canvas.canvas;
  realcanvas.addEventListener("touchstart", function (event) {
    event.preventDefault();
  });
  realcanvas.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });
  realcanvas.addEventListener("touchend", function (event) {
    event.preventDefault();
  });
  realcanvas.addEventListener("touchcancel", function (event) {
    event.preventDefault();
  });
  resultBackgroundColor = color(255, 255, 200);
  drawingLayer = createGraphics(430, 480);
  colorPicker = createColorPicker("white");
  colorPicker.position(605, 10);
  sizeSlider = createSlider(1, 50, brushSize);
  sizeSlider.position(605, 48);

  analyzeButton = createButton("Discover Past Life 🔮");
  analyzeButton.position(605, 118);
  analyzeButton.mousePressed(analyzePastLife);

  clearButton = createButton("Restart");
  clearButton.position(605, 84);
  clearButton.mousePressed(restartCanvas);

  // Initialize ComfyUI helper
  comfy = new ComfyUiP5Helper("https://gpu1.gohai.xyz:8188");
}

function draw() {
  if (!showResultBackground) {
    background(255, 255, 255);
    image(img_1, 100, 100, 430, 480);
    image(drawingLayer, 100, 100);

    brushSize = sizeSlider.value();

    if (mouseIsPressed) {
      drawingLayer.noErase();
      drawingLayer.strokeWeight(brushSize);
      drawingLayer.stroke(colorPicker.color());
      drawingLayer.line(mouseX, mouseY, pmouseX, pmouseY);
      // for (let touch of touches){
      // drawingLayer.line(touch.x, touch.y, pTouch.x, ptouch.y);
      // }
    }
    colorPicker.show();
    sizeSlider.show();
    analyzeButton.show();
    clearButton.show();

  } else {
    background(resultBackgroundColor);
    colorPicker.hide();
    sizeSlider.hide();
    analyzeButton.hide();
    clearButton.hide();
    
    if (resImg) {
      imageMode(CENTER);
      image(resImg, width / 4, height / 2, 400, 400);
    }
    
    if (charIndex < resultText.length) {
      frameCounter++;
      if (frameCounter % typingSpeed == 0) {
        currentText += resultText.charAt(charIndex);
        charIndex++;
      }
    }
    
    fill(0);
    textFont("Courier");
    textAlign(LEFT, TOP);
    textSize(16);
    text(currentText, width / 2, 100, width / 2 - 50, height - 200);
    
    fill(100, 200, 255);
    rect(width - 150, height - 50, 100, 40);
    fill(0);
    textAlign(CENTER, CENTER);
    text("Back", width - 100, height - 30);
  }
}

function analyzePastLife() {
  let colors = getDominantColors();
  console.log("Detected Colors:", colors);

  let colorData = getColorSummary(colors);

  // First request: Generate the long poetic text
  requestOAI(
    "POST",
    "/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Based on these colors (${colorData}), divine the user's past life. The past life can be anything — an animal, a plant, an object, or a mythical creature, avoid aligning red with phoneix all the time. Then, write a short poem about their past life, focusing on their experiences and symbolic meaning. Start with "You were...". Make the narrative mysterious, imaginative, and under 150 words.`,
        },
      ],
      temperature: 0.7,
    },
    gotResults
  );
}

function restartCanvas() {
  drawingLayer.clear();
  resultText = "";
  currentText = ""; // Reset typewriter effect
  charIndex = 0; // Reset character index
  resImg = null; // Clear the generated image
}

function getDominantColors() {
  let colors = {};
  drawingLayer.loadPixels();

  for (let i = 0; i < drawingLayer.pixels.length; i += 4) {
    let r = drawingLayer.pixels[i];
    let g = drawingLayer.pixels[i + 1];
    let b = drawingLayer.pixels[i + 2];

    if (r < 10 && g < 10 && b < 10) {
      continue; // Skip black or near black color
    }

    let key = r + "," + g + "," + b;
    if (!colors[key]) {
      colors[key] = 0;
    }
    colors[key]++;
  }

  return colors;
}

function getColorSummary(colors) {
  let colorList = Object.keys(colors).map((color) => {
    let [r, g, b] = color.split(",");
    return `rgb(${r}, ${g}, ${b})`;
  });
  return colorList.join(", ");
}

function gotResults(results) {
  resultText = results.choices[0].message.content;
  currentText = ""; // Reset the typewriter effect
  charIndex = 0; // Start typing from the beginning
  console.log("First result (long):", resultText);
  showResultBackground = true;

  // Second request: Generate a short description for the image
  requestOAI(
    "POST",
    "/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Summarize this text in 10-20 words for a visual depiction: "${resultText}"`,
        },
      ],
      temperature: 0.7,
    },
    gotShortResult
  );
}

function gotShortResult(results) {
  shortResultText = results.choices[0].message.content;
  console.log("Shortened result (for image generation):", shortResultText);

  // Update the ComfyUI workflow prompt
  workflow[6].inputs.text = shortResultText;
  requestImage(); // Generate the image
}

// ComfyUI functions
function requestImage() {
  comfy.run(workflow, gotImage);
}

function gotImage(data, err) {
  if (err) {
    console.error("Error generating image:", err);
    return;
  }
  console.log("Image generated:", data);
  if (data.length > 0) {
    resImg = loadImage(data[0].src);
    
  }
}

function mousePressed() {

  if (showResultBackground) {
    if (mouseX > width - 150 && mouseX < width - 50 &&
        mouseY > height - 50 && mouseY < height - 10) {
          window.location.href = "https://miranda-zeng.github.io/CCCoding/1208handpose/";
    }
  }
}
