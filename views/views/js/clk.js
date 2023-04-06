function updateTime() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    var ampm = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var timeString = addZeroPadding(hours) + ':' + addZeroPadding(minutes) + ':' + addZeroPadding(seconds) + ' ' + ampm;
    document.getElementById('clock').innerHTML = timeString;
}

function addZeroPadding(num) {
    return (num < 10 ? '0' : '') + num;
}
setInterval(updateTime, 1000);