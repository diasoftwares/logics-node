const XLSX = require("xlsx");
const fs = require("fs");
const clients = require("./config/clients");
const verifiers = require("./config/verifiers");
const headers = require("./config/headers");
const _ = require("lodash");
const moment = require("moment");
const ExcelJS = require("exceljs");

const script = async () => {
  try {
    const client = clients.neuberg;
    console.log("running raphacure invoice logic");

    const raphacureJSON = await convertToJSON(
      "./assets/raphacure_admin.xlsx",
      true,
    );

    console.log("raphacureJSON headers", raphacureJSON.headers);

    const neubergJSON = await convertToJSON("./assets/neuberg.xlsx", false);

    console.log("neubergJSON headers", neubergJSON.headers);

    const { response, correctItemsData } = verifyData(
      raphacureJSON,
      neubergJSON,
      client,
    );
    fs.writeFileSync(
      "./assets/verificationResponse.json",
      JSON.stringify(response),
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Correct Invoices");

    console.log("correctItemsData",correctItemsData)
    correctItemsData.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => { 
        let cell = worksheet.getCell(rowIndex + 1, colIndex + 1);
        cell.value = value;

        //For coloring
        /*if (colorRows.includes(rowIndex)) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFF00" },
          };
        }*/
      });
    });


    const filePath = `./assets/verificationResponse.xlsx`;

    await workbook.xlsx.writeFile(filePath);

    console.log("Completed running")
  } catch (e) {
    console.log(e);
  }
};

const convertToJSON = async (path, headerNotHeader) => {
  const workbook = XLSX.readFile(path);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Convert the worksheet to an array of objects
  const rows = XLSX.utils.sheet_to_json(worksheet);

  let list;
  let headersData;
  if (headerNotHeader) {
    const headers = Object.values(rows[0]);
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
    list = data;

    headersData = await getExcelHeaders(path);
  } else {
    list = rows;
    headersData = await getExcelHeaders(path);
  }

  return { list, headers: headersData };
};

async function getExcelHeaders(path) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0]; // Assuming the headers are in the first worksheet

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cell.value);
  });

  return headers;
}

const convertToMoment = (dateValue) => {
  try {
    if (typeof dateValue == "number") {
      const date = XLSX.SSF.format("mm/dd/yyyy", dateValue);
      const dateMoment = moment(date);
      return dateMoment;
    } else {
      const dateMoment = moment(
        extractOnlyDateFromString(dateValue),
        "DD/MM/YYYY",
      );
      return dateMoment;
    }
  } catch (e) {
    console.log("error", e);
    return null;
  }
};

const extractOnlyDateFromString = (dateString) => {
  const regex = /^(\d{2}\/\d{2}\/\d{4})/;
  const onlyDate = dateString.match(regex)[1];
  console.log(dateString, onlyDate);
  return onlyDate;
};

const verifyData = (raphacureData, clientData, clientType) => {
  const needToVerify = verifiers[clientType];
  const response = {};
  const mismatches = [];
  //const raphacureIdsEmpty = [];
  const clientIdsEmpty = [];
  const missingInRaphacure = [];
  // const idsInRaphacure = [];
  const idsInClient = [];

  const raphacureList = raphacureData.list;
  const clientList = clientData.list;
  const clientHeaders = clientData.headers;

  const correctItemsData = [];
  correctItemsData.push(clientHeaders);

  /*raphacureList.forEach((item, index) => {
    if (item[headers.raphacure.booking_id]) {
      idsInRaphacure.push(item[headers.raphacure.booking_id].trim());
    } else {
      raphacureIdsEmpty.push({
        name: item[headers.raphacure.name],
        row_id: index,
      });
    }
  });*/

  console.log("raphacure list", raphacureList.length);

  clientList.forEach((item, index) => {
    if (item[headers[clientType].booking_id]) {
      idsInClient.push(item[headers[clientType].booking_id].trim());
    } else {
      clientIdsEmpty.push({
        name: item[headers[clientType].name],
        row_id: index,
      });
    }
  });

  console.log("client list", clientList.length);

  //Checking missing items in both the
  /*const missingInRaphacure = _.differenceWith(
    idsInRaphacure,
    idsInClient,
    _.isEqual,
  );
  const missingInClient = _.differenceWith(
    idsInClient,
    idsInRaphacure,
    _.isEqual,
  );

  const allIds = _.union(missingInRaphacure, missingInClient);*/

  for (const id of idsInClient) {
    const raphacure = raphacureList.find(
      (item) => item[headers.raphacure.booking_id] == id.trim(),
    );
    const client = clientList.find(
      (item) => item[headers[clientType].booking_id] == id,
    );
    if (raphacure) {
      const itemMismatch = [];
      for (const verifierItem of needToVerify) {
        if (verifierItem == "date") {
          /* console.log("checking for date", id);
          console.log(
            raphacure[headers.raphacure[verifierItem]],
            client[headers[clientType][verifierItem]],
          );
          console.log(
            _.isEmpty(raphacure[headers.raphacure[verifierItem]]),
            !client[headers[clientType][verifierItem]],
          );*/
          if (
            _.isEmpty(raphacure[headers.raphacure[verifierItem]]) ||
            !client[headers[clientType][verifierItem]]
          ) {
            //console.log("raphacure or client data empty", id);
            const raphacure_key = `raphacure_${verifierItem}`;
            const client_key = `client_${verifierItem}`;
            itemMismatch.push({
              [raphacure_key]: raphacure[headers.raphacure[verifierItem]],
              [client_key]: client[headers[clientType][verifierItem]],
            });
          } else {
            //console.log("raphacure and client data empty", id);

            const raphacureMoment = convertToMoment(
              raphacure[headers.raphacure[verifierItem]],
            );
            const clientMoment = convertToMoment(
              client[headers[clientType][verifierItem]],
            );

            console.log(
              raphacure[headers.raphacure[verifierItem]],
              client[headers[clientType][verifierItem]],
            );
            console.log(raphacureMoment, clientMoment);

            if (!raphacureMoment.isSame(clientMoment, "day")) {
              const raphacure_key = `raphacure_${verifierItem}`;
              const client_key = `client_${verifierItem}`;
              itemMismatch.push({
                [raphacure_key]: raphacure[headers.raphacure[verifierItem]],
                [client_key]: client[headers[clientType][verifierItem]],
              });
            }
          }
        } else if (
          !raphacure[headers.raphacure[verifierItem]] ||
          !client[headers[clientType][verifierItem]] ||
          raphacure[headers.raphacure[verifierItem]].trim() !=
            client[headers[clientType][verifierItem]].trim()
        ) {
          const raphacure_key = `raphacure_${verifierItem}`;
          const client_key = `client_${verifierItem}`;
          itemMismatch.push({
            [raphacure_key]: raphacure[headers.raphacure[verifierItem]],
            [client_key]: client[headers[clientType][verifierItem]],
          });
        }
      }

      if (itemMismatch.length > 0) {
        mismatches.push({
          booking_id: id,
          itemMismatch,
        });
      } else {
        const itemData = [];
        for (const clientHeader of clientHeaders) {
          itemData.push(client[clientHeader]);
        }
        correctItemsData.push(itemData);
      }
    } else {
      missingInRaphacure.push(id);
    }
  }

  response.missingInRaphacure = missingInRaphacure;
  response.clientIdsEmpty = clientIdsEmpty;
  response.mismatches = mismatches;

  console.log("correctItemsData", correctItemsData)
  return { response, correctItemsData };
};

script();
