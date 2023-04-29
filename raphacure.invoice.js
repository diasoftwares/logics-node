const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { stringify } = require("querystring");

const script = async () => {
  try {
    console.log("running raphacure invoice logic");

    const raphacureJSON = convertToJSON("./assets/raphacure_admin.xlsx", true);

    fs.writeFileSync("./assets/raphacureJSON.json", raphacureJSON);
  } catch (e) {
    console.log(e);
  }
};

const convertToJSON = (path, headerNotHeader) => {
  const workbook = XLSX.readFile(path);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Convert the worksheet to an array of objects
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (headerNotHeader) {
    const headers = Object.values(rows[0]);
    console.log(headers);
    // Iterate through each row
    const data = [];
    rows.forEach((row, index) => {
      // Do something with the row
      if (index > 0) {
        const eachItem = {};
        for (let i = 0; i < Object.values(row).length; i++) {
          const value = Object.values(row)[i];
          const key = headers[i];
          eachItem[key] = value;
        }

        data.push(eachItem);
      }
    });
    return JSON.stringify(data);
  } else {
    return JSON.stringify(rows);
  }
};

script();
