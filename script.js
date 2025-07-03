// Import the necessary message classes from the msgClasses.js module.
// This allows us to create structured objects from the parsed XML data.
import { Message, MSG01, MSG02, MSG05, MSG07 } from './msgClasses.js';


// script.js
// This file contains the core client-side logic for the Credit Log application.
// It handles:
// 1. User interactions (file selection, button clicks).
// 2. Asynchronously reading and parsing uploaded XML files.
// 3. Fetching external data (currency exchange rates).
// 4. Processing and combining data from different message types (MSG01, MSG02, etc.).
// 5. Dynamically generating and displaying an HTML table with the results.
// 6. Providing functionality to copy the table data.

const fileInput = document.getElementById('fileInput');         // The <input type="file"> element.
const processButton = document.getElementById('processButton');   // The "Process Files" button.
const output = document.getElementById('output');                 // The <div> where the results table will be rendered.
let uploadedFiles = [];                                           // An array to hold the File objects selected by the user.

// Global collections to store the parsed message objects from all uploaded files.
const allMsg01s = new Map(); // Key: SenderCode_SellerNr, Value: MSG01 instance
const allMsg02s = [];
const allMsg05s = [];
const allMsg07s = [];
let exchangeRates = null;

// Handle the 'change' event on the file input element.
fileInput.addEventListener('change', (event) => {
    // When the user selects files, store them in the `uploadedFiles` array.
    uploadedFiles = Array.from(event.target.files);
    // Enable the "Process Files" button only if one or more files have been selected.
    if (uploadedFiles.length > 0) {
        processButton.disabled = false;
    }
});

// Main processing logic triggered by clicking the "Process Files" button.
// The function is `async` to allow for `await`ing the fetch request for exchange rates.
processButton.addEventListener('click', async () => { // Make the event listener async
    output.innerHTML = ''; // Clear previous output
    resetGlobalMessageCollections(); // Clear previous data

    // Fetch up-to-date exchange rates once when the button is clicked.
    
    try {
        // Use the fetch API to get the latest USD exchange rates from a free public API.
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.result === 'success') {
            exchangeRates = data.rates;
            console.log("Successfully fetched up-to-date exchange rates.");
        } else {
            throw new Error(`API returned an error: ${data['error-type']}`);
        }
    } catch (error) {
        console.error("Could not fetch exchange rates. Conversion to USD will not be available.", error);
    }

    // Initialize a counter to track when all files have been read.
    let filesReadCount = 0;
    const totalFilesToRead = uploadedFiles.length;

    // Iterate over each file the user selected.
    uploadedFiles.forEach((file) => {
        // Use FileReader to read the file content asynchronously.
        const reader = new FileReader();

        // The 'onload' event fires when the file has been successfully read.
        reader.onload = () => {
            // Read the file as an ArrayBuffer to handle character encoding correctly.
            const buffer = new Uint8Array(reader.result);
            // Decode a small initial chunk of the file to look for an XML encoding declaration.
            const chunk = buffer.subarray(0, 1024);
            const chunkAsString = new TextDecoder('latin1').decode(chunk);

            let encoding = 'utf-8';
            let encodingDeclared = false;
            const encodingMatch = chunkAsString.match(/<\?xml\s+.*?encoding\s*=\s*"(.*?)"/i);
            if (encodingMatch) {
                encoding = encodingMatch[1].toLowerCase();
                encodingDeclared = true;
            }

            let xmlString;
            // Attempt to decode the entire file into a string.
            try {
                // Use the detected encoding (or the 'utf-8' default). `fatal: true` ensures an error is thrown for invalid characters.
                xmlString = new TextDecoder(encoding, { fatal: true }).decode(buffer);
            } catch (e) {
                console.warn(`Failed to decode with primary encoding ('${encoding}'). Error:`, e);
                // If decoding fails and no encoding was declared, it's likely a legacy encoding.
                if (!encodingDeclared) {
                    // Try 'windows-1254' as a fallback, which is common for Turkish characters.
                    const fallbackEncoding = 'windows-1254';
                    try {
                        xmlString = new TextDecoder(fallbackEncoding).decode(buffer);
                    } catch (fallbackError) {
                        console.error(`Fallback to '${fallbackEncoding}' also failed. Decoding with lossy UTF-8 as a last resort.`, fallbackError);
                        // If all else fails, decode as UTF-8, which may result in replacement characters ().
                        xmlString = new TextDecoder('utf-8').decode(buffer);
                    }
                } else {
                    console.warn(`The declared encoding '${encoding}' seems incorrect. Falling back to lossy UTF-8.`);
                    xmlString = new TextDecoder('utf-8').decode(buffer);
                }
            }

            // Use the browser's built-in DOMParser to parse the XML string into a document object.
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

            // Find all relevant message nodes within the parsed XML document.
            const msgNodes = xmlDoc.querySelectorAll('MSG01, MSG02, MSG05, MSG07');

            // Process each found message node.
            msgNodes.forEach(node => {
                try {
                    const nodeName = node.nodeName;
                    let instance;
                    // Based on the node name, create an instance of the corresponding class.
                    if (nodeName === 'MSG01') {
                        instance = MSG01.fromXMLString(node.outerHTML);
                        const key = `${instance.msgInfo.SenderCode}_${instance.seller.SellerNr}`;
                        allMsg01s.set(key, instance);
                    } else if (nodeName === 'MSG02') {
                        instance = MSG02.fromXMLString(node.outerHTML);
                        allMsg02s.push(instance);
                    } else if (nodeName === 'MSG05') {
                        instance = MSG05.fromXMLString(node.outerHTML);
                        allMsg05s.push(instance);
                    } else if (nodeName === 'MSG07') {
                        instance = MSG07.fromXMLString(node.outerHTML);
                        allMsg07s.push(instance);
                    }
                } catch (error) {
                    console.error(`Error parsing ${node.nodeName} from file ${file.name}:`, error.message);
                }
            });

            // Increment the counter for processed files.
            filesReadCount++;
            if (filesReadCount === totalFilesToRead) {
                // Once all files have been read and parsed, generate the combined data and display the table.
                // All files have been read, now combine and display
                const displayRows = generateCombinedDisplayData();
                displayTable(displayRows, exchangeRates);
            }
        };
        reader.readAsArrayBuffer(file);
    });
});

/**
 * Clears all data from the global message collections.
 * This is called at the beginning of processing to ensure no data from previous runs is carried over.
 */
function resetGlobalMessageCollections() {
    allMsg01s.clear();
    allMsg02s.length = 0;
    allMsg05s.length = 0;
    allMsg07s.length = 0;
}

/**
 * Generates an array of row objects ready for display.
 * It iterates through transactional messages (02, 05, 07), combines them with
 * their corresponding seller info message (01), and structures the data for the table.
 * @returns {Array<object>} An array of objects, where each object represents a row in the final table.
 */
function generateCombinedDisplayData() {
    const combinedData = [];

    // Combine all transactional messages into a single array to iterate over.
    [...allMsg02s, ...allMsg05s, ...allMsg07s].forEach(msg => {
        const msgType = msg.type;
        // Create a unique key based on the sender and seller number to find the matching MSG01.
        const key = `${msg.msgInfo.SenderCode}_${msg.seller.SellerNr}`;
        const matchedMsg01 = allMsg01s.get(key);

        // Create a structured 'row' object with default/empty values.
        let row = {
            requestDate: '',
            dateReceived: msg.msgInfo.DateTime ? msg.msgInfo.DateTime.slice(0, 10) : '',
            reminder: 'No',
            newAcctNameAddressChange: 'No',
            cancellation: 'No',
            buyerName: msg.buyer ? msg.buyer.BuyerName : '',
            buyerCountry: msg.buyer ? msg.buyer.Country || '' : '', // MSG07 might not have Country
            sellerName: msg.seller ? msg.seller.SellerName : '',
            sellerCountry: '', // To be inferred
            partnerName: msg.ef ? msg.ef.FactorName : '',
            partnerCountry: '', // To be inferred
            messageType: msgType.slice(-1), // '2', '5', '7'
            amountReq: '',
            currency: '',
            term: '',
            contactAllowed: 'No',
            msgFunctionCode: '', // 3, 6, 8
            amtApproved: '',
            msg3ExpirationDate: '',
            insurance: '',
            responseDate: '',
            ofacDate: '',
            rate: '',
            incomingComments: msg.msgText || '',
            creditComments: '',
            aeComments: '',
            daysToRespond: '',
            creditManager: '', // To be calculated
            aeCso: '',
            industryProduct: '', // From MSG01
            clientCode: msg.ef ? msg.ef.FactorCode : '',
            amountReqUSD: '' // To be calculated
        };

        // Populate fields that vary based on the message type (Amount, Currency, Term, etc.).
        if (msgType === 'MSG02') {
            row.requestDate = msg.requestDate || '';
            row.amountReq = msg.prelCreditAssessDetails ? msg.prelCreditAssessDetails.AmtCreditAssessReq : '';
            row.currency = msg.prelCreditAssessDetails ? msg.prelCreditAssessDetails.Currency : '';
            row.term = msg.prelCreditAssessDetails ? msg.prelCreditAssessDetails.NetPmtTerms : '';
            row.contactAllowed = (msg.buyer && msg.buyer.DirectContact == 1) ? 'Yes' : 'No';
        } else if (msgType === 'MSG05') {
            row.requestDate = msg.requestDate || '';
            row.amountReq = msg.creditCoverDetails ? msg.creditCoverDetails.NewCreditCoverAmt : '';
            row.currency = msg.creditCoverDetails ? msg.creditCoverDetails.Currency : '';
            row.term = msg.creditCoverDetails ? msg.creditCoverDetails.NetPmtTerms : '';
            row.contactAllowed = (msg.buyer && msg.buyer.DirectContact == 1) ? 'Yes' : 'No';
        } else if (msgType === 'MSG07') {
            row.requestDate = msg.requestDate || '';
            row.amountReq = msg.newCreditCoverDetails ? msg.newCreditCoverDetails.NewCreditCoverAmt : '';
            row.currency = msg.currentCreditCoverDetails ? msg.currentCreditCoverDetails.Currency : '';
            row.term = msg.newCreditCoverDetails ? msg.newCreditCoverDetails.LongCreditPeriodDays : '';
            // MSG07 buyer doesn't have DirectContact
        }

        // If a matching MSG01 was found, populate the row with its data.
        if (matchedMsg01) {
            row.industryProduct = matchedMsg01.sellerDetails ? matchedMsg01.sellerDetails.BusinessProduct : '';
            // If MSG01 MsgDate is relevant for Request Date when the paired msg doesn't have it, uncomment below
            // if (!row.requestDate) {
            //     row.requestDate = matchedMsg01.msgDate || '';
            // }
        }

        // Infer country names from the 2-letter country codes in the FactorCode.
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const exportFactorCodeCharacters = msg.ef ? msg.ef.FactorCode.substring(0, 2) : '';
        row.partnerCountry = exportFactorCodeCharacters ? regionNames.of(exportFactorCodeCharacters) : '';
        row.sellerCountry = row.partnerCountry; // Assuming seller country is same as export factor country based on current script's logic

        // Calculate the USD equivalent for the requested amount.
        let creditAmountUSDformat = convertToUSD(row.amountReq, row.currency, exchangeRates);
        console.log(creditAmountUSDformat);
        
        // Determine the assigned credit manager based on business rules.
        row.creditManager = getCreditManager(exportFactorCodeCharacters, creditAmountUSDformat, row.partnerName);
        combinedData.push(row);
    });

    // Sort the final data by the date the message was received for a chronological view.
    combinedData.sort((a, b) => new Date(a.dateReceived) - new Date(b.dateReceived));

    return combinedData;
}

/**
 * Renders the final HTML table from the processed data rows.
 * @param {Array<object>} displayRows - An array of row objects from `generateCombinedDisplayData`.
 * @param {object|null} exchangeRates - The exchange rate data fetched from the API.
 */
function displayTable(displayRows, exchangeRates) {
    // Start building the table HTML with the header row.
    let tableHTML = `<table border="1"><tr>
        <th>Request Date</th>
        <th>Date Received</th>
        <th>Reminder (Yes/No)</th>
        <th>New Acct / Name Address Change (Yes/No)</th>
        <th>Cancellation (Yes/No)</th>
        <th>Buyer</th>
        <th>Buyer Country</th>
        <th>Seller</th>
        <th>Seller Country</th>
        <th>Partner</th>
        <th>Partner Country</th>
        <th>2,5,7</th>
        <th>Amount Req</th>
        <th>Currency</th>
        <th>Term</th>
        <th>Contact Allowed (Yes/No)</th>
        <th>3, 6, 8</th>
        <th>Amt Appr</th>
        <th>Msg 3 Expiration Date</th>
        <th>Insurance (Yes/No)</th>
        <th>Response Date</th>
        <th>OFAC Date</th>
        <th>Rate</th>
        <th>Incoming Comments</th>
        <th>Credit Comments</th>
        <th>AE Comments</th>
        <th># Days to Respond</th>
        <th>Credit Manager</th>
        <th>AE/CSO</th>
        <th>Industry / Product</th>
        <th>Client Code</th>
    </tr>`;

    //        <th>Amount Req (USD)</th>

    // Iterate over each processed row object to create a <tr> element.
    displayRows.forEach(row => {

        // Find today's date:
        var today = new Date();
        today = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') + '-' + today.getFullYear();

        // Append the new table row with all its data cells (<td>).
        tableHTML += `<tr>
            <td>${row.requestDate}</td>
            <td>${today}</td>
            <td>${row.reminder}</td>
            <td>${row.newAcctNameAddressChange}</td>
            <td>${row.cancellation}</td>
            <td>${row.buyerName}</td>
            <td>${row.buyerCountry}</td>
            <td>${row.sellerName}</td>
            <td>${row.sellerCountry}</td>
            <td>${row.partnerName}</td>
            <td>${row.partnerCountry}</td>
            <td>${row.messageType}</td>
            <td>${row.amountReq}</td>
            <td>${row.currency}</td>
            <td>${row.term}</td>
            <td>${row.contactAllowed}</td>
            <td>${row.msgFunctionCode}</td>
            <td>${row.amtApproved}</td>
            <td>${row.msg3ExpirationDate}</td>
            <td>${row.insurance}</td>
            <td>${row.responseDate}</td>
            <td>${row.ofacDate}</td>
            <td>${row.rate}</td>
            <td>${row.incomingComments}</td>
            <td>${row.creditComments}</td>
            <td>${row.aeComments}</td>
            <td>${row.daysToRespond}</td>
            <td>${row.creditManager}</td>
            <td>${row.aeCso}</td>
            <td>${row.industryProduct}</td>
            <td>${row.clientCode}</td>
        </tr>`;
    });

    // <td>${creditAmountUSDformat}</td>

    // Close the table tag and set the innerHTML of the output div.
    tableHTML += '</table>';
    output.innerHTML = tableHTML;
    console.log("All files processed. Table output updated.");
    // Now that the table exists, enable the "Copy as TSV" buttons.
    if (copyTSVWithHeader) copyTSVWithHeader.disabled = false;
    if (copyTSVNoHeader) copyTSVNoHeader.disabled = false;
}

/**
 * Converts an amount from a given currency to USD using the fetched exchange rates.
 * @param {string|number} amount - The amount to convert.
 * @param {string} currency - The currency code of the amount (e.g., 'EUR', 'TRY').
 * @param {object|null} rates - The exchange rate data object where keys are currency codes.
 * @returns {string} A formatted string representing the amount in USD or an error/status message.
 */
function convertToUSD(amount, currency, rates) {
    if (amount == null || amount === '') return ' ';
    if (currency == null || currency === '') return 'N/A';

    // Ensure the amount is a valid number.
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return 'Invalid Amount';

    // Handle cases where the exchange rates could not be fetched.
    if (!rates) {
        return `Failed to fetch rates`;
    }

    // If the currency is already USD, just format and return it.
    if (currency.toUpperCase() === 'USD') {
        return amount;
    }

    const rate = rates[currency.toUpperCase()];
    if (!rate) {
        console.warn(`Exchange rate for ${currency.toUpperCase()} not found.`);
        return `${numericAmount.toFixed(2)} ${currency} (No Rate)`;
    }

    // Perform the conversion (rates are relative to 1 USD).
    const amountInUSD = numericAmount / rate;
    return amountInUSD;
}

/**
 * Determines the responsible credit manager based on a set of business rules.
 * @param {string} countryCode - The two-letter country code of the partner.
 * @param {string|number} creditLine - The requested credit amount.
 * @param {string} factorName - The name of the factoring partner.
 * @returns {string} The name of the assigned credit manager ('lux', 'trey', or 'bost').
 */
function getCreditManager(countryCode, creditLine, factorName) {
    const numericCreditLine = parseFloat(creditLine);
    if (isNaN(numericCreditLine)) return "N/A"; // Handle invalid credit line

    // Rule 1: Based on credit line amount.
    if (numericCreditLine <= 500000) {
        return "lux";
    } else {
        // Rule 2: Based on country code and specific partner names.
        const treyCountryCodes = ['AM', 'EG', 'GR', 'IN', 'MT', 'RO', 'TW', 'TR', 'VN'];
        const treySpecialCodes = ['SG', 'JP', 'US'];
        if (treyCountryCodes.includes(countryCode)) {
            return "trey";
        } else if (treySpecialCodes.includes(countryCode)) {
            if (countryCode === 'SG' && factorName.includes("Mogli")) {
                return "trey";
            } else if (countryCode === 'JP' && (factorName.includes("Mitsubishi") || factorName.includes("Sumitomo Mitsui"))) {
                return "trey";
            } else if (countryCode === 'US' && factorName.includes("Standard Chartered Bank New York")) {
                return "trey";
            }
        }
    }
    // Default assignment.
    return "bost";
}

// Get references to the "Copy as TSV" buttons.
const copyTSVWithHeader = document.getElementById('copyTSVWithHeader');
const copyTSVNoHeader = document.getElementById('copyTSVNoHeader');

/**
 * Copies the content of the generated table to the clipboard in Tab-Separated Values (TSV) format.
 * @param {boolean} [includeHeader=true] - Whether to include the table's header row in the copied data.
 */
function copyTableAsTSV(includeHeader = true) {
    const table = output.querySelector('table');
    if (!table) return;

    // Initialize the TSV string.
    let tsv = '';
    // Determine the starting row based on whether the header should be included.
    let startRow = 0;
    if (!includeHeader) startRow = 1;

    // Iterate over the table rows.
    for (let i = startRow; i < table.rows.length; i++) {
        let rowData = [];
        // Collect the text from each cell in the current row.
        for (let cell of table.rows[i].cells) {
            // Sanitize text to remove tabs and newlines which would break the TSV format.
            let text = cell.innerText.replace(/\t/g, ' ').replace(/\n/g, ' ');
            rowData.push(text);
        }
        tsv += rowData.join('\t') + '\n';
    }
    // Use the modern Clipboard API to write the TSV string.
    navigator.clipboard.writeText(tsv).then(() => {
        if (includeHeader) {
            copyTSVWithHeader.textContent = 'Copied!';
            setTimeout(() => { copyTSVWithHeader.textContent = 'Copy Table as TSV (with header)'; }, 1500);
        } else {
            copyTSVNoHeader.textContent = 'Copied!';
            setTimeout(() => { copyTSVNoHeader.textContent = 'Copy Table as TSV (no header)'; }, 1500);
        }
    });
}

// Attach the copy function to the click events of the buttons.
if (copyTSVWithHeader) {
    copyTSVWithHeader.disabled = true;
    copyTSVWithHeader.addEventListener('click', () => copyTableAsTSV(true));
}
if (copyTSVNoHeader) {
    copyTSVNoHeader.disabled = true;
    copyTSVNoHeader.addEventListener('click', () => copyTableAsTSV(false));
}



