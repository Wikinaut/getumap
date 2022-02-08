'use strict';

const getNowString = () => {
    let nowString = '';

    const today = new Date();

    const year = today.getFullYear();
    nowString += year;
    nowString += '-';

    const month = today.getMonth() + 1;
    nowString += month < 10 ? ('0' + month) : month;
    nowString += '-';

    const day = today.getDate();
    nowString += day < 10 ? ('0' + day) : day;
    nowString += ' ';

    const hours = today.getHours();
    nowString += hours < 10 ? ('0' + hours) : hours;
    nowString += '-';

    const minutes = today.getMinutes();
    nowString += minutes < 10 ? ('0' + minutes) : minutes;
    nowString += '-';

    const seconds = today.getSeconds();
    nowString += seconds < 10 ? ('0' + seconds) : seconds;

    return nowString;
};

const getFilenameWithNowString = (filename) => {

    const nowString = getNowString();

    return (nowString + ' ' + filename).replace(/[^A-Za-z0-9\-\_\.: ]/g, '');
};

module.exports = {
    getNowString: getNowString,
    getFilenameWithNowString: getFilenameWithNowString
};
