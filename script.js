let btn = document.querySelector("#btn");
let content = document.querySelector("#content");
let connectBtn;

let device, obstacleChar;
let reconnectInterval;

// --- Speak Function (Normal male voice) ---
function speak(text) {
    let msg = new SpeechSynthesisUtterance(text);

    let voices = window.speechSynthesis.getVoices();
    // Pick a normal English male voice if available
    msg.voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) || voices[0];

    msg.rate = 1;   // normal speed
    msg.pitch = 1;  // normal pitch
    msg.volume = 1;

    // Natural speech without ellipses
    msg.text = text;

    window.speechSynthesis.speak(msg);
}

// --- Greet User ---
function wishMe() {
    let day = new Date();
    let hours = day.getHours();
    if (hours >= 0 && hours < 12) speak("Good morning, Sir.");
    else if (hours < 16) speak("Good afternoon, Sir.");
    else speak("Good evening, Sir.");
}
window.addEventListener('load', () => { wishMe(); });

// --- Speech Recognition ---
let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = new SpeechRecognition();

recognition.onresult = (event) => {
    let currentIndex = event.resultIndex;
    let transcript = event.results[currentIndex][0].transcript;
    content.innerText = transcript;
    takeCommand(transcript.toLowerCase());
};

btn.addEventListener("click", () => {
    recognition.start();
});

// --- Connect to Arduino via BLE ---
async function connectArduino() {
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "SmartCane" }],
            optionalServices: ["12345678-1234-5678-1234-56789abcdef0"]
        });

        device.addEventListener('gattserverdisconnected', handleDisconnect);

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService("12345678-1234-5678-1234-56789abcdef0");
        obstacleChar = await service.getCharacteristic("abcdefab-1234-5678-1234-56789abcdef0");

        await obstacleChar.startNotifications();
        obstacleChar.addEventListener("characteristicvaluechanged", handleObstacleNotification);

        speak("Connection to Smart Cane established successfully.");
        console.log("Connected ✅");

        if (reconnectInterval) clearInterval(reconnectInterval);

    } catch (err) {
        console.error("Connection failed:", err);
        speak("Connection failed, please try again.");
    }
}

// --- Handle Notifications ---
function handleObstacleNotification(event) {
    let value = new TextDecoder().decode(event.target.value);
    console.log("Obstacle:", value);
    if (value && value !== "CLEAR") speak(value);
}

// --- Handle Disconnection & Auto-reconnect ---
function handleDisconnect() {
    console.warn("Smart Cane disconnected!");
    speak("Smart Cane disconnected. Attempting to reconnect.");

    reconnectInterval = setInterval(async () => {
        try {
            if (!device) return;
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService("12345678-1234-5678-1234-56789abcdef0");
            obstacleChar = await service.getCharacteristic("abcdefab-1234-5678-1234-56789abcdef0");
            await obstacleChar.startNotifications();
            obstacleChar.addEventListener("characteristicvaluechanged", handleObstacleNotification);

            speak("Reconnected to Smart Cane successfully.");
            console.log("Reconnected ✅");

            clearInterval(reconnectInterval);

        } catch (err) {
            console.warn("Reconnect attempt failed:", err);
        }
    }, 5000);
}

// --- Emergency Function (opens dialer on mobile) ---
function callEmergency() {
    let caretakerNumber = "584782659"; // remove spaces for tel: scheme
    speak("Calling your caretaker.");
    window.location.href = `tel:${caretakerNumber}`; // opens phone dialer
}

// --- Location Feature ---
function tellLocationAndNearby() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            speak(`Your current location is latitude ${lat.toFixed(3)}, longitude ${lon.toFixed(3)}. Opening nearby hospitals on Google Maps.`);
            window.open(`https://www.google.com/maps/search/hospitals/@${lat},${lon},15z`);
        }, error => {
            console.error(error);
            speak("Sorry, I couldn't get your location.");
        });
    } else {
        speak("Geolocation is not supported by your browser.");
    }
}

// --- Add Connect Arduino Button Listener ---
window.addEventListener("DOMContentLoaded", () => {
    connectBtn = document.getElementById("connectBtn");
    connectBtn.addEventListener("click", connectArduino);
});

// --- Commands ---
function takeCommand(message) {
    if (message.includes("hello")) speak("Hello, Sir. How may I assist you?");
    else if (message.includes("who are you")) speak("I am your virtual assistant, Healix.");
    else if (message.includes("how are you")) speak("I am operating at optimal efficiency.");
    else if (message.includes("what is your name")) speak("I am Healix.");
    else if (message.includes("bye")) speak("Goodbye, Sir. Until next time.");
    else if (message.includes("cane")) {
        speak("Connecting to your smart cane now.");
        connectArduino();
    }
    else if (message.includes("emergency") || message.includes("help")) callEmergency();
    else if (message.includes("location") || message.includes("nearby")) tellLocationAndNearby();
    else {
        let varSearch = "https://www.google.com/search?q=" + message;
        speak("Here is what I found on the web regarding your query.");
        window.open(varSearch);
    }
}
