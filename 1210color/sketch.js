let openai_api_proxy = "https://zest-quiet-phalange.glitch.me/";

let img_1;

let drawingLayer;
let canvas;

let colorPicker;
let brushSize = 10;
let sizeSlider;
let analyzeButton, clearButton, revealButton, reloadButton;
let instruction, colorDesc, brushDesc;

let resultText = "";
let currentText = "";
let charIndex = 0;
let typingSpeed = 2;
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
  colorPicker.position(655, 110);
  sizeSlider = createSlider(1, 50, brushSize);
  sizeSlider.position(655, 148);

  analyzeButton = createButton("Discover Your Past Life 🔮");
  analyzeButton.position(655, 218);
  analyzeButton.mousePressed(analyzePastLife);

  clearButton = createButton("Restart");
  clearButton.position(655, 184);
  clearButton.mousePressed(restartCanvas);

  revealButton = createButton("Reveal Full Story");
  revealButton.position(width - 150, height - 200);
  revealButton.mousePressed(revealFullStory);

  reloadButton = createButton("Back");
  reloadButton.position(width - 150, height - 150);
  reloadButton.size(100, 40);
  reloadButton.mousePressed(resetAndReload);

  instruction = createP("Color your hand in any way you want 🌈");
  instruction.position(100, 20);
  instruction.style('font-family', 'Georgia');
  instruction.style('font-size', '24px');
  instruction.style('color', '#4A4A4A');

  colorDesc = createP("Choose Your Palette");
  colorDesc.position(800, 100);
  colorDesc.style('font-size', '12px');
  colorDesc.style('color', '#666');

  brushDesc = createP("Adjust Brush Size");
  brushDesc.position(800, 140);
  brushDesc.style('font-size', '12px');
  brushDesc.style('color', '#666');

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
      drawingLayer.line(mouseX-100, mouseY-100, pmouseX-100, pmouseY-100);
      // for (let touch of touches){
      // drawingLayer.line(touch.x, touch.y, pTouch.x, ptouch.y);
      // }
    }
    colorPicker.show();
    sizeSlider.show();
    analyzeButton.show();
    clearButton.show();
    instruction.show();
    colorDesc.show();
    brushDesc.show();
    revealButton.hide();
    reloadButton.hide();

  } else {
    background(resultBackgroundColor);
    colorPicker.hide();
    sizeSlider.hide();
    analyzeButton.hide();
    clearButton.hide();
    instruction.hide();
    colorDesc.hide();
    brushDesc.hide();
    revealButton.show();
    reloadButton.show();

    let subtitle = createP("Story of Your Past Life");
    subtitle.position(100, 20);
    subtitle.style('font-family', 'Georgia');
    subtitle.style('font-size', '24px');
    subtitle.style('color', '#4A4A4A');

    if (resImg) {
      imageMode(CENTER);
      image(resImg, width / 4, height / 2-50, 400, 400);
    }
   
    if (charIndex < resultText.length) {
      frameCounter++;
      if (frameCounter % typingSpeed == 0) {
        currentText += resultText.charAt(charIndex);
        charIndex++;
      }
    }
    
    fill(0);
    textFont("Georgia");
    textAlign(LEFT, TOP);
    textSize(16);
    text(currentText, width / 2, 100, width / 2 - 50, height - 200);
    
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
          content: `
          You are a creative storyteller with the task of interpreting the user's past life based on these colors: (${colorData}).
          - The past life can be anything: an animal, plant, object, mythical creature, or even a natural element like the wind or sea.
          - Focus on adding variety in interpretations. Do not overly rely on common archetypes like "phoenix" or "dragon."
          - Incorporate sensory details (e.g., sights, sounds, textures) and emotional tones (e.g., joy, sorrow, mystery).
          - Begin with "You were..." and conclude with a symbolic or reflective line connecting the past to the present.
          - Keep the response imaginative, evocative, and under 150 words.
          - Ensure each response feels unique and aligned with the chosen colors.`     },
      ],
      temperature: 0.8,
      presence_penalty: 1.0, 
      frequency_penalty: 0.5, 
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

function revealFullStory() {
  currentText = resultText;
  charIndex = resultText.length;
}

function resetAndReload() {
  // clear localStorage
  // localStorage.removeItem('capturedHandImage');
  
  resultText = "";
  currentText = "";
  charIndex = 0;
  resImg = null;
  showResultBackground = false;
  
  drawingLayer.clear();

  window.location.href = "https://miranda-zeng.github.io/CCCoding/1208handpose/" + 
                         "?timestamp=" + new Date().getTime();
}


