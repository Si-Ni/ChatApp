const socket = io("http://192.168.178.104:3000/", { transports : ['websocket'] });
        
        function register() {
          window.location.href = 'register.html'
        }

        const inputForm = document.getElementById("passwordForm");
        const inputUsername = document.getElementById("username");
        const inputPassword = document.getElementById("password");
        var inputUsernameLogin;

        inputForm.addEventListener("submit", (e) => {
          e.preventDefault();
          if(inputUsername.value && inputPassword.value){
            socket.emit("loginTry", {username: inputUsername.value, password: inputPassword.value});
          }
        });

        socket.on("user-doesnt-exist", () => {
          document.getElementById("Ausgabe").innerText = "Dieser Nutzername wurde nicht gefunden"
        });

        socket.on("access", () => {
          inputUsernameLogin = inputUsername.value;
          localStorage.setItem("vOneLocalStorage", inputUsernameLogin);  
          window.location.href = "index.html";
        })

        socket.on("denied", () => {
          document.getElementById("Ausgabe").innerText = "Falsches Passwort"
        })
    
