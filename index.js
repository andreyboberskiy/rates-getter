import axios from "axios";
import fs from "fs";
import "dotenv/config";

const axiosInstance = axios.create({
  baseURL: "https://min-api.cryptocompare.com/data/",
});

axiosInstance.interceptors.request.use((config) => {
  console.log("Axios request");
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
    }
  }

  return historyRates;
};

async function main() {
  const allRates = await getAllRates();
  const historyRates = await getHistoryRates();

  const dataIntoFile = JSON.stringify({ allRates, historyRates }, null, "\t");

  fs.writeFile(process.env.PATH_TO_RATES_FILE, dataIntoFile, function (err) {
    if (err) return console.log(err);
    console.log("Rates updated");
  });
}

main();
