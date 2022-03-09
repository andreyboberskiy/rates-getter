import axios from "axios";
import fs from "fs";
import "dotenv/config";

const isDev = process.env.DEV === "true";

const logInFile = (...texts) => {
  const log = texts
    .map((t) => `${new Date().toLocaleString("pt-Pt")} ${t}\n`)
    .join("");

  fs.appendFile("logs.txt", log, function (err) {
    if (err) console.log(err);
  });
};

const axiosInstance = axios.create({
  baseURL: "https://min-api.cryptocompare.com/data/",
  headers: isDev
    ? undefined
    : {
        authorization:
          "Apikey aa24bafd50249685fa0510adb699ed90e63d85047d37395afc6e498f1714fd59",
      },
});

axiosInstance.interceptors.request.use((config) => {
  console.log("Axios request");
  logInFile("Axios request");
  return config;
});

const crypto = [
  "BTC",
  "ETH",
  "EOS",
  "USDT",
  "USDC",
  "XRP",
  "DASH",
  "LTC",
  "BCH",
  "ALGO",
  "TRX",
];

const fiat = ["EUR", "USD", "GBP"];

const currencies = [...fiat, ...crypto];

const checkDataValidation = (data) => {
  return typeof data["BTC"] === "object";
};

const getAllRates = async () => {
  const currenciesString = currencies.join(",");
  const allRatesUrl = `pricemulti?fsyms=${currenciesString}&tsyms=${currenciesString}`;

  const { data: currenciesRates } = await axiosInstance.get(allRatesUrl);

  if (checkDataValidation(currenciesRates)) {
    const allRates = {};
    Object.entries(currenciesRates).forEach(([fromCurrency, toCurrencies]) => {
      Object.entries(toCurrencies).forEach(([toCurrency, rate]) => {
        allRates[`${fromCurrency}/${toCurrency}`] = rate;
      });
    });

    return allRates;
  } else {
    console.log("All rates request failed", currenciesRates);
    logInFile("All rates request failed", currenciesRates);
  }
};

const getHistoryRates = async () => {
  const defaultCurrency = "EUR";

  const historyRates = {};

  for (const currency of crypto) {
    const queryString = `histohour?fsym=${currency}&tsym=${defaultCurrency}&limit=25`;

    const { data } = await axiosInstance.get(queryString);

    const direction = `${currency}/${defaultCurrency}`;
    if (data.Response === "Success" && data.Data) {
      historyRates[direction] = data.Data.map((i) => i.close);
    } else {
      console.log("Cant get history response by this direction: ", direction);
      logInFile("Cant get history response by this direction: ", direction);
    }
  }

  return historyRates;
};

const checkValid = (data) =>
  typeof data === "object" && Object.keys(data)?.length > 0;

async function main() {
  const allRates = await getAllRates();
  const historyRates = await getHistoryRates();

  if (checkValid(allRates) && checkValid(historyRates)) {
    const dataIntoFile = JSON.stringify({ allRates, historyRates }, null, "\t");

    fs.writeFile(
      process.env.PATH_TO_RATES_FILE || "/var/www/nebeus.com/html/rates.json",
      dataIntoFile,
      function (err) {
        if (err) {
          return logInFile(JSON.stringify(err));
        }
        logInFile("Rates updated");
        console.log("Rates updated");
      }
    );
  } else {
    logInFile("Rates not written in file, data is invalid");
    console.log("Rates not written in file, data is invalid");
  }
}

main();
