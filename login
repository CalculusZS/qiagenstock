<h2>🔐 Login</h2>
<input type="password" id="pw">
<button onclick="login()">Login</button>
<p id="msg"></p>

<script>
function login() {
  google.script.run.withSuccessHandler(r=>{
    if(r){ location.href="?page=user"; }
    else{ document.getElementById("msg").innerText="Wrong password"; }
  }).checkPassword(document.getElementById("pw").value);
}
</script>
