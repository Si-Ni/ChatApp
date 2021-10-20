const socket = io("http://192.168.178.104:3000/", { transports : ['websocket'] });


var loginForm = document.getElementById("passwordForm");
var inputU = document.getElementById("username");
var inputPw = document.getElementById("password");
var ip;


loginForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if(inputU.value && inputPw.value) {
        fetch('https://api.ipify.org/?format=json')
	        .then(results => results.json())
	        .then(data => {
		        ip = (data.ip);
                socket.emit("login-try", {username: inputU.value, password: inputPw.value, ip: ip})
	        })
    }
});

socket.on("access", () => {
    window.location.href = 'http://192.168.178.104:3000/admin';
});

socket.on("denied", () => {
    document.getElementById("Ausgabe").innerText="Falsche Zugangsdaten -- Login verweigert";
});