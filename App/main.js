
const socket = io("http://192.168.178.104:3000/", { transports : ['websocket'] });
var inputUsernameLogin = localStorage.getItem("vOneLocalStorage");
console.log(inputUsernameLogin)
if (inputUsernameLogin === null) {
    inputUsernameLogin = "Gastnutzer";
}

        var form = document.getElementById("eingabeForm");
        var input = document.getElementById("eingabe");
        var online = document.getElementById("online");

        appendMessage("Du bist dem Chatroom beigetreten");
        socket.emit("new-user", inputUsernameLogin);

        form.addEventListener("submit", function(e) {
            e.preventDefault();
            if(input.value) {
                const msg = input.value;
                socket.emit("chat message", input.value);
                input.value = "";
                input.focus();
            }
        });

        socket.on("chat message", data => {
            appendMessage(`${data.name}(${data.time}): ${data.msg}`);
        });

        socket.on("user-connected", name => {
            appendMessage(`${name} ist dem Raum beigetreten`);
        });

        socket.on("user-disconnected", name => {
            appendMessage(`${name} hat den Raum verlassen`);
        });
        
        socket.on("online", users => {
            usersOnline(users);
        });

        function appendMessage(msg){
            var item = document.createElement('li');
            item.textContent = msg;
            ausgabe.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);
        }

        function usersOnline(users){
            const usernames = [];
            for(let i = 0; i < users.length; i++){
                let user = users[i];
                usernames.push(user.name);
            }
            online.innerHTML = `<p>online: ${usernames.join(", ")}</p>`
        }

        socket.on("alleMessages", data => {
            if(data.username === "Gastnutzer") {
                
            }else if (data.username === inputUsernameLogin){
                data.username = "Du";
            }
            appendMessage(`${data.username}(${data.time}): ${data.text}`);
        });