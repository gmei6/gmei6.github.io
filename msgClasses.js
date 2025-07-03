//msgClasses.js

// JavaScript source code

/**
 * Base Message Class
 * Provides common properties and methods for all message types.
 */
export class Message {
    /**
     * Constructs a new Message instance.
     * @param {string} type - The type of the message (e.g., 'MSG01').
     * @param {string} timestamp - The timestamp when the message was created.
     * @param {string} senderId - The ID of the sender.
     * @param {object} payload - The core data payload of the message.
     */
    constructor(type, timestamp, senderId, payload = {}) {
        this.type = type;
        this.timestamp = timestamp;
        this.senderId = senderId;
        this.payload = payload;
    }

    /**
     * Converts the message instance to a plain JavaScript object.
     * @returns {object} A plain object representation of the message.
     */
    toObject() {
        return {
            type: this.type,
            timestamp: this.timestamp,
            senderId: this.senderId,
            payload: this.payload,
        };
    }

    /**
     * Returns a string representation of the message.
     * @returns {string} A string representing the message.
     */
    toString() {
        return `[${this.type}] From: ${this.senderId} at ${this.timestamp} - Payload: ${JSON.stringify(this.payload)}`;
    }
}

/**
 * MSG01 Class: System Status Update / Detailed Agreement Data
 * This class is designed to parse and represent the complex XML structure
 * provided for MSG01 messages, containing detailed information about
 * message metadata, factor details, seller information, and agreement terms.
 */
export class MSG01 extends Message {
    /**
     * Constructs a new MSG01 instance from parsed XML data.
     * @param {object} data - An object representing the parsed XML structure for MSG01.
     * @param {object} data.MsgInfo - Information about the message itself.
     * @param {string} data.MsgInfo.SenderCode
     * @param {string} data.MsgInfo.ReceiverCode
     * @param {string} data.MsgInfo.CreatedBy
     * @param {number} data.MsgInfo.SequenceNr
     * @param {string} data.MsgInfo.DateTime - ISO string format.
     * @param {number} data.MsgInfo.Status
     * @param {object} data.EF - Export Factor details.
     * @param {string} data.EF.FactorCode
     * @param {string} data.EF.FactorName
     * @param {object} data.IF - Import Factor details.
     * @param {string} data.IF.FactorCode
     * @param {string} data.IF.FactorName
     * @param {string} data.MsgDate - Date of the message (YYYY-MM-DD).
     * @param {number} data.MsgFunction - Function code of the message.
     * @param {string} data.FactAgreemSigned - Date when factoring agreement was signed (YYYY-MM-DD).
     * @param {object} data.Seller - Seller details.
     * @param {string} data.Seller.SellerNr
     * @param {string} data.Seller.SellerName
     * @param {string} data.Seller.NameCont
     * @param {string} data.Seller.Street
     * @param {string} data.Seller.City
     * @param {string} data.Seller.State
     * @param {string} data.Seller.Postcode
     * @param {string} data.Seller.Country
     * @param {object} data.SellerDetails - Additional seller business details.
     * @param {string} data.SellerDetails.BusinessProduct
     * @param {number} data.SellerDetails.NetPmtTerms
     * @param {number|null} data.SellerDetails.Discount1Days
     * @param {number|null} data.SellerDetails.Discount2Days
     * @param {number|null} data.SellerDetails.GracePeriod
     * @param {string} data.SellerDetails.InvCurrency1
     * @param {number} data.SellerDetails.ChargeBackPerc
     * @param {number} data.SellerDetails.ChargeBackAmt
     * @param {string} data.SellerDetails.ChargeBackCurrency
     * @param {number} data.SellerDetails.ExpTotSellerTurnover
     * @param {number} data.SellerDetails.ExpNrBuyers
     * @param {number} data.SellerDetails.ExpNrInvoices
     * @param {number|null} data.SellerDetails.ExpNrCreditNotes
     * @param {number} data.SellerDetails.ExpTurnover
     * @param {number} data.SellerDetails.ExpOtherTurnover
     * @param {number} data.SellerDetails.OtherFactors
     * @param {number} data.SellerDetails.ServiceRequired
     * @param {object} [data.BankDetailsSeller] - Optional bank details for the seller.
     * @param {string} [data.MsgText] - Optional free text message.
     */
    constructor(data) {
        // Extract base Message properties from the XML data's MsgInfo
        const type = 'MSG01';
        const timestamp = data.MsgInfo.DateTime;
        const senderId = data.MsgInfo.SenderCode;

        // The entire data object becomes the payload for this complex message
        super(type, timestamp, senderId, data);

        // Assign parsed data directly to properties for easier access
        this.msgInfo = data.MsgInfo;
        this.ef = data.EF;
        this._if = data.IF; // Renamed to _if to avoid 'if' keyword conflict
        this.msgDate = data.MsgDate;
        this.msgFunction = data.MsgFunction;
        this.factAgreemSigned = data.FactAgreemSigned;
        this.seller = data.Seller;
        this.sellerDetails = data.SellerDetails;
        this.bankDetailsSeller = data.BankDetailsSeller || {}; // Initialize as empty object if not present
        this.msgText = data.MsgText || ''; // Initialize as empty string if not present
    }

    /**
     * Static method to create an MSG01 instance from an XML string.
     * This method uses DOMParser, which is available in browser environments.
     * If running in Node.js, you would need a library like `jsdom` or `xmldom`.
     * @param {string} xmlString - The XML string representing an MSG01 message.
     * @returns {MSG01} A new MSG01 instance.
     * @throws {Error} If XML parsing fails or required data is missing.
     */
    static fromXMLString(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Check for parsing errors
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            console.error('XML Parsing Error:', errorNode.textContent);
            throw new Error('Failed to parse XML string.');
        }

        const getElementText = (element, tagName) => {
            const node = element.querySelector(tagName);
            return node ? node.textContent : null;
        };

        const getElementNumber = (element, tagName) => {
            const text = getElementText(element, tagName);
            return text !== null && text !== '' ? Number(text) : null;
        };

        const root = xmlDoc.querySelector('MSG01');
        if (!root) {
            throw new Error('Invalid MSG01 XML structure: Root <MSG01> element not found.');
        }

        const msgInfoElement = root.querySelector('MsgInfo');
        if (!msgInfoElement) {
            throw new Error('Invalid MSG01 XML structure: <MsgInfo> element not found.');
        }

        const efElement = root.querySelector('EF');
        if (!efElement) {
            throw new Error('Invalid MSG01 XML structure: <EF> element not found.');
        }

        const ifElement = root.querySelector('IF');
        if (!ifElement) {
            throw new Error('Invalid MSG01 XML structure: <IF> element not found.');
        }

        const sellerElement = root.querySelector('Seller');
        if (!sellerElement) {
            throw new Error('Invalid MSG01 XML structure: <Seller> element not found.');
        }

        const sellerDetailsElement = root.querySelector('SellerDetails');
        if (!sellerDetailsElement) {
            throw new Error('Invalid MSG01 XML structure: <SellerDetails> element not found.');
        }

        const data = {
            MsgInfo: {
                SenderCode: getElementText(msgInfoElement, 'SenderCode'),
                ReceiverCode: getElementText(msgInfoElement, 'ReceiverCode'),
                CreatedBy: getElementText(msgInfoElement, 'CreatedBy'),
                SequenceNr: getElementNumber(msgInfoElement, 'SequenceNr'),
                DateTime: getElementText(msgInfoElement, 'DateTime'),
                Status: getElementNumber(msgInfoElement, 'Status'),
            },
            EF: {
                FactorCode: getElementText(efElement, 'FactorCode'),
                FactorName: getElementText(efElement, 'FactorName'),
            },
            IF: {
                FactorCode: getElementText(ifElement, 'FactorCode'),
                FactorName: getElementText(ifElement, 'FactorName'),
            },
            MsgDate: getElementText(root, 'MsgDate'),
            MsgFunction: getElementNumber(root, 'MsgFunction'),
            FactAgreemSigned: getElementText(root, 'FactAgreemSigned'),
            Seller: {
                SellerNr: getElementText(sellerElement, 'SellerNr'),
                SellerName: getElementText(sellerElement, 'SellerName'),
                NameCont: getElementText(sellerElement, 'NameCont'), // Can be empty
                Street: getElementText(sellerElement, 'Street'),
                City: getElementText(sellerElement, 'City'),
                State: getElementText(sellerElement, 'State'), // Can be empty
                Postcode: getElementText(sellerElement, 'Postcode'),
                Country: getElementText(sellerElement, 'Country'),
            },
            SellerDetails: {
                BusinessProduct: getElementText(sellerDetailsElement, 'BusinessProduct'),
                NetPmtTerms: getElementNumber(sellerDetailsElement, 'NetPmtTerms'),
                Discount1Days: getElementNumber(sellerDetailsElement, 'Discount1Days'),
                Discount2Days: getElementNumber(sellerDetailsElement, 'Discount2Days'),
                GracePeriod: getElementNumber(sellerDetailsElement, 'GracePeriod'),
                InvCurrency1: getElementText(sellerDetailsElement, 'InvCurrency1'),
                ChargeBackPerc: getElementNumber(sellerDetailsElement, 'ChargeBackPerc'),
                ChargeBackAmt: getElementNumber(sellerDetailsElement, 'ChargeBackAmt'),
                ChargeBackCurrency: getElementText(sellerDetailsElement, 'ChargeBackCurrency'),
                ExpTotSellerTurnover: getElementNumber(sellerDetailsElement, 'ExpTotSellerTurnover'),
                ExpNrBuyers: getElementNumber(sellerDetailsElement, 'ExpNrBuyers'),
                ExpNrInvoices: getElementNumber(sellerDetailsElement, 'ExpNrInvoices'),
                ExpNrCreditNotes: getElementNumber(sellerDetailsElement, 'ExpNrCreditNotes'), // Can be empty
                ExpTurnover: getElementNumber(sellerDetailsElement, 'ExpTurnover'),
                ExpOtherTurnover: getElementNumber(sellerDetailsElement, 'ExpOtherTurnover'),
                OtherFactors: getElementNumber(sellerDetailsElement, 'OtherFactors'),
                ServiceRequired: getElementNumber(sellerDetailsElement, 'ServiceRequired'),
            },
            BankDetailsSeller: root.querySelector('BankDetailsSeller') ? {} : null, // Empty if exists, null if not
            MsgText: getElementText(root, 'MsgText'),
        };

        return new MSG01(data);
    }

    /**
     * Get the sender code from the message info.
     * @returns {string} The sender code.
     */
    getSenderCode() {
        return this.msgInfo.SenderCode;
    }

    /**
     * Get the created date and time as a Date object.
     * @returns {Date} The created date and time.
     */
    getCreationDateTime() {
        return new Date(this.msgInfo.DateTime);
    }

    /**
     * Get the seller's name.
     * @returns {string} The seller's name.
     */
    getSellerName() {
        return this.seller.SellerName;
    }

    /**
     * Get the business product from seller details.
     * @returns {string} The business product.
     */
    getBusinessProduct() {
        return this.sellerDetails.BusinessProduct;
    }
}

/**
 * MSG02 Class: User Login Event / Preliminary Credit Assessment Request
 * This class is designed to parse and represent the complex XML structure
 * provided for MSG02 messages, containing details about message metadata,
 * factor details, seller, buyer, and preliminary credit assessment request.
 */
export class MSG02 extends Message {
    /**
     * Constructs a new MSG02 instance from parsed XML data.
     * @param {object} data - An object representing the parsed XML structure for MSG02.
     * @param {object} data.MsgInfo - Information about the message itself.
     * @param {string} data.MsgInfo.SenderCode
     * @param {string} data.MsgInfo.ReceiverCode
     * @param {string} data.MsgInfo.CreatedBy
     * @param {number} data.MsgInfo.SequenceNr
     * @param {string} data.MsgInfo.DateTime - ISO string format.
     * @param {number} data.MsgInfo.Status
     * @param {object} data.EF - Export Factor details.
     * @param {string} data.EF.FactorCode
     * @param {string} data.EF.FactorName
     * @param {object} data.IF - Import Factor details.
     * @param {string} data.IF.FactorCode
     * @param {string} data.IF.FactorName
     * @param {string} data.RequestDate - Date of the request (YYYY-MM-DD).
     * @param {string} data.RequestNr - Unique request number.
     * @param {number} data.MsgFunction - Function code of the message.
     * @param {object} data.Seller - Seller details.
     * @param {string} data.Seller.SellerNr
     * @param {string} data.Seller.SellerName
     * @param {object} data.Buyer - Buyer details.
     * @param {string} data.Buyer.BuyerNr
     * @param {string} data.Buyer.BuyerName
     * @param {string} data.Buyer.Street
     * @param {string} data.Buyer.City
     * @param {string} data.Buyer.State
     * @param {string} data.Buyer.Postcode
     * @param {string} data.Buyer.Country
     * @param {number} data.Buyer.DirectContact
     * @param {object} [data.BankDetailsBuyer] - Optional bank details for the buyer.
     * @param {object} data.PrelCreditAssessDetails - Preliminary credit assessment details.
     * @param {number} data.PrelCreditAssessDetails.AmtCreditAssessReq
     * @param {string} data.PrelCreditAssessDetails.Currency
     * @param {number} data.PrelCreditAssessDetails.NetPmtTerms
     * @param {number|null} data.PrelCreditAssessDetails.Discount1Days
     * @param {number|null} data.PrelCreditAssessDetails.Discount2Days
     * @param {string} [data.MsgText] - Optional free text message.
     */
    constructor(data) {
        const type = 'MSG02';
        const timestamp = data.MsgInfo.DateTime;
        const senderId = data.MsgInfo.SenderCode;

        super(type, timestamp, senderId, data);

        this.msgInfo = data.MsgInfo;
        this.ef = data.EF;
        this._if = data.IF;
        this.requestDate = data.RequestDate;
        this.requestNr = data.RequestNr;
        this.msgFunction = data.MsgFunction;
        this.seller = data.Seller;
        this.buyer = data.Buyer;
        this.bankDetailsBuyer = data.BankDetailsBuyer || {};
        this.prelCreditAssessDetails = data.PrelCreditAssessDetails;
        this.msgText = data.MsgText || '';
    }

    /**
     * Static method to create an MSG02 instance from an XML string.
     * This method uses DOMParser, which is available in browser environments.
     * If running in Node.js, you would need a library like `jsdom` or `xmldom`.
     * @param {string} xmlString - The XML string representing an MSG02 message.
     * @returns {MSG02} A new MSG02 instance.
     * @throws {Error} If XML parsing fails or required data is missing.
     */
    static fromXMLString(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Check for parsing errors
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            console.error('XML Parsing Error:', errorNode.textContent);
            throw new Error('Failed to parse XML string.');
        }

        const getElementText = (element, tagName) => {
            const node = element.querySelector(tagName);
            return node ? node.textContent : null;
        };

        const getElementNumber = (element, tagName) => {
            const text = getElementText(element, tagName);
            return text !== null && text !== '' ? Number(text) : null;
        };

        const root = xmlDoc.querySelector('MSG02');
        if (!root) {
            throw new Error('Invalid MSG02 XML structure: Root <MSG02> element not found.');
        }

        const msgInfoElement = root.querySelector('MsgInfo');
        if (!msgInfoElement) {
            throw new Error('Invalid MSG02 XML structure: <MsgInfo> element not found.');
        }

        const efElement = root.querySelector('EF');
        if (!efElement) {
            throw new Error('Invalid MSG02 XML structure: <EF> element not found.');
        }

        const ifElement = root.querySelector('IF');
        if (!ifElement) {
            throw new Error('Invalid MSG02 XML structure: <IF> element not found.');
        }

        const sellerElement = root.querySelector('Seller');
        if (!sellerElement) {
            throw new Error('Invalid MSG02 XML structure: <Seller> element not found.');
        }

        const buyerElement = root.querySelector('Buyer');
        if (!buyerElement) {
            throw new Error('Invalid MSG02 XML structure: <Buyer> element not found.');
        }

        const prelCreditAssessDetailsElement = root.querySelector('PrelCreditAssessDetails');
        if (!prelCreditAssessDetailsElement) {
            throw new Error('Invalid MSG02 XML structure: <PrelCreditAssessDetails> element not found.');
        }

        const data = {
            MsgInfo: {
                SenderCode: getElementText(msgInfoElement, 'SenderCode'),
                ReceiverCode: getElementText(msgInfoElement, 'ReceiverCode'),
                CreatedBy: getElementText(msgInfoElement, 'CreatedBy'),
                SequenceNr: getElementNumber(msgInfoElement, 'SequenceNr'),
                DateTime: getElementText(msgInfoElement, 'DateTime'),
                Status: getElementNumber(msgInfoElement, 'Status'),
            },
            EF: {
                FactorCode: getElementText(efElement, 'FactorCode'),
                FactorName: getElementText(efElement, 'FactorName'),
            },
            IF: {
                FactorCode: getElementText(ifElement, 'FactorCode'),
                FactorName: getElementText(ifElement, 'FactorName'),
            },
            RequestDate: getElementText(root, 'RequestDate'),
            RequestNr: getElementText(root, 'RequestNr'),
            MsgFunction: getElementNumber(root, 'MsgFunction'),
            Seller: {
                SellerNr: getElementText(sellerElement, 'SellerNr'),
                SellerName: getElementText(sellerElement, 'SellerName'),
            },
            Buyer: {
                BuyerNr: getElementText(buyerElement, 'BuyerNr'),
                BuyerName: getElementText(buyerElement, 'BuyerName'),
                Street: getElementText(buyerElement, 'Street'),
                City: getElementText(buyerElement, 'City'),
                State: getElementText(buyerElement, 'State'),
                Postcode: getElementText(buyerElement, 'Postcode'),
                Country: getElementText(buyerElement, 'Country'),
                DirectContact: getElementNumber(buyerElement, 'DirectContact'),
            },
            BankDetailsBuyer: root.querySelector('BankDetailsBuyer') ? {} : null, // Empty object if exists, null if not
            PrelCreditAssessDetails: {
                AmtCreditAssessReq: getElementNumber(prelCreditAssessDetailsElement, 'AmtCreditAssessReq'),
                Currency: getElementText(prelCreditAssessDetailsElement, 'Currency'),
                NetPmtTerms: getElementNumber(prelCreditAssessDetailsElement, 'NetPmtTerms'),
                Discount1Days: getElementNumber(prelCreditAssessDetailsElement, 'Discount1Days'), // Can be empty
                Discount2Days: getElementNumber(prelCreditAssessDetailsElement, 'Discount2Days'), // Can be empty
            },
            MsgText: getElementText(root, 'MsgText'), // Can be empty
        };

        return new MSG02(data);
    }

    /**
     * Get the request number for this MSG02 message.
     * @returns {string} The request number.
     */
    getRequestNumber() {
        return this.requestNr;
    }

    /**
     * Get the buyer's name.
     * @returns {string} The buyer's name.
     */
    getBuyerName() {
        return this.buyer.BuyerName;
    }

    /**
     * Get the requested credit assessment amount.
     * @returns {number} The amount requested for credit assessment.
     */
    getRequestedCreditAmount() {
        return this.prelCreditAssessDetails.AmtCreditAssessReq;
    }

    /**
     * Get the currency of the requested credit assessment.
     * @returns {string} The currency.
     */
    getRequestedCreditCurrency() {
        return this.prelCreditAssessDetails.Currency;
    }
}

/**
 * MSG05 Class: Credit Cover Request
 * Represents an MSG05 message, which is a formal request for credit cover.
 * This is typically a more detailed request than an MSG02 and involves specific amounts and terms.
 */
export class MSG05 extends Message {
    /**
     * Constructs a new MSG05 instance from parsed XML data.
     * @param {object} data - An object representing the parsed XML structure for MSG05.
     * @param {object} data.MsgInfo
     * @param {string} data.MsgInfo.SenderCode
     * @param {string} data.MsgInfo.ReceiverCode
     * @param {string} data.MsgInfo.CreatedBy
     * @param {number} data.MsgInfo.SequenceNr
     * @param {string} data.MsgInfo.DateTime
     * @param {number} data.MsgInfo.Status
     * @param {object} data.EF
     * @param {string} data.EF.FactorCode
     * @param {string} data.EF.FactorName
     * @param {object} data.IF
     * @param {string} data.IF.FactorCode
     * @param {string} data.IF.FactorName
     * @param {string} data.RequestDate
     * @param {string} data.RequestNr
     * @param {number} data.MsgFunction
     * @param {object} data.Seller
     * @param {string} data.Seller.SellerNr
     * @param {string} data.Seller.SellerName
     * @param {object} data.Buyer
     * @param {number} data.Buyer.BuyerCompanyRegNr
     * @param {string} data.Buyer.BuyerNr
     * @param {string} data.Buyer.BuyerName
     * @param {string} data.Buyer.Street
     * @param {string} data.Buyer.City
     * @param {string} data.Buyer.Postcode
     * @param {string} data.Buyer.Country
     * @param {number} data.Buyer.DirectContact
     * @param {string|null} data.Buyer.Telephone
     * @param {object} [data.BankDetailsBuyer]
     * @param {object} data.CreditCoverDetails
     * @param {number} data.CreditCoverDetails.Request
     * @param {number} data.CreditCoverDetails.NewCreditCoverAmt
     * @param {string} data.CreditCoverDetails.Currency
     * @param {number} data.CreditCoverDetails.OwnRiskAmt
     * @param {number} data.CreditCoverDetails.OwnRiskPerc
     * @param {number} data.CreditCoverDetails.NetPmtTerms
     * @param {number|null} data.CreditCoverDetails.Discount1Days
     * @param {number|null} data.CreditCoverDetails.Discount1Perc
     * @param {number|null} data.CreditCoverDetails.Discount2Days
     * @param {number|null} data.CreditCoverDetails.Discount2Perc
     * @param {number|null} data.CreditCoverDetails.OrderNr
     * @param {string} [data.MsgText]
     */
    constructor(data) {
        // Set up the base message properties.
        const type = 'MSG05';
        const timestamp = data.MsgInfo.DateTime;
        const senderId = data.MsgInfo.SenderCode;

        // Initialize the base class and the payload.
        super(type, timestamp, senderId, data);

        this.msgInfo = data.MsgInfo;
        this.ef = data.EF;
        this._if = data.IF;
        this.requestDate = data.RequestDate;
        this.requestNr = data.RequestNr;
        this.msgFunction = data.MsgFunction;
        this.seller = data.Seller;
        this.buyer = data.Buyer;
        this.bankDetailsBuyer = data.BankDetailsBuyer || {};
        this.creditCoverDetails = data.CreditCoverDetails;
        this.msgText = data.MsgText || '';
    }

    /**
     * Static factory method to create an MSG05 instance from a raw XML string.
     * Encapsulates the parsing logic for this specific message type.
     * @param {string} xmlString - The XML string representing an MSG05 message.
     * @returns {MSG05} A new MSG05 instance.
     * @throws {Error} If XML parsing fails or required data is missing.
     */
    static fromXMLString(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Check for parsing errors.
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            console.error('XML Parsing Error:', errorNode.textContent);
            throw new Error('Failed to parse XML string.');
        }

        // Helper function to safely get text content.
        const getElementText = (element, tagName) => {
            const node = element.querySelector(tagName);
            return node ? node.textContent : null;
        };

        // Helper function to safely get and convert text to a number.
        const getElementNumber = (element, tagName) => {
            const text = getElementText(element, tagName);
            return text !== null && text !== '' ? Number(text) : null;
        };

        // Find the root <MSG05> element.
        const root = xmlDoc.querySelector('MSG05');
        if (!root) {
            throw new Error('Invalid MSG05 XML structure: Root <MSG05> element not found.');
        }

        // Locate all major sections of the XML to ensure the structure is valid.
        const msgInfoElement = root.querySelector('MsgInfo');
        const efElement = root.querySelector('EF');
        const ifElement = root.querySelector('IF');
        const sellerElement = root.querySelector('Seller');
        const buyerElement = root.querySelector('Buyer');
        const creditCoverDetailsElement = root.querySelector('CreditCoverDetails');

        // This validation step is crucial. It confirms that the XML document has the expected
        // high-level structure before we try to access deeper, nested data, which prevents
        // "Cannot read properties of null" errors.
        if (!msgInfoElement || !efElement || !ifElement || !sellerElement || !buyerElement || !creditCoverDetailsElement) {
            throw new Error('Missing required elements in MSG05 XML.');
        }

        const data = {
            MsgInfo: {
                SenderCode: getElementText(msgInfoElement, 'SenderCode'),
                ReceiverCode: getElementText(msgInfoElement, 'ReceiverCode'),
                CreatedBy: getElementText(msgInfoElement, 'CreatedBy'),
                SequenceNr: getElementNumber(msgInfoElement, 'SequenceNr'),
                DateTime: getElementText(msgInfoElement, 'DateTime'),
                Status: getElementNumber(msgInfoElement, 'Status'),
            },
            EF: {
                FactorCode: getElementText(efElement, 'FactorCode'),
                FactorName: getElementText(efElement, 'FactorName'),
            },
            IF: {
                FactorCode: getElementText(ifElement, 'FactorCode'),
                FactorName: getElementText(ifElement, 'FactorName'),
            },
            RequestDate: getElementText(root, 'RequestDate'),
            RequestNr: getElementText(root, 'RequestNr'),
            MsgFunction: getElementNumber(root, 'MsgFunction'),
            Seller: {
                SellerNr: getElementText(sellerElement, 'SellerNr'),
                SellerName: getElementText(sellerElement, 'SellerName'),
            },
            Buyer: {
                BuyerCompanyRegNr: getElementNumber(buyerElement, 'BuyerCompanyRegNr'),
                BuyerNr: getElementText(buyerElement, 'BuyerNr'),
                BuyerName: getElementText(buyerElement, 'BuyerName'),
                Street: getElementText(buyerElement, 'Street'),
                City: getElementText(buyerElement, 'City'),
                Postcode: getElementText(buyerElement, 'Postcode'),
                Country: getElementText(buyerElement, 'Country'),
                DirectContact: getElementNumber(buyerElement, 'DirectContact'),
                Telephone: getElementText(buyerElement, 'Telephone'), // Can be null
            },
            BankDetailsBuyer: root.querySelector('BankDetailsBuyer') ? {} : null,
            CreditCoverDetails: {
                Request: getElementNumber(creditCoverDetailsElement, 'Request'),
                NewCreditCoverAmt: getElementNumber(creditCoverDetailsElement, 'NewCreditCoverAmt'),
                Currency: getElementText(creditCoverDetailsElement, 'Currency'),
                OwnRiskAmt: getElementNumber(creditCoverDetailsElement, 'OwnRiskAmt'),
                OwnRiskPerc: getElementNumber(creditCoverDetailsElement, 'OwnRiskPerc'),
                NetPmtTerms: getElementNumber(creditCoverDetailsElement, 'NetPmtTerms'),
                Discount1Days: getElementNumber(creditCoverDetailsElement, 'Discount1Days'),
                Discount1Perc: getElementNumber(creditCoverDetailsElement, 'Discount1Perc'),
                Discount2Days: getElementNumber(creditCoverDetailsElement, 'Discount2Days'),
                Discount2Perc: getElementNumber(creditCoverDetailsElement, 'Discount2Perc'),
                OrderNr: getElementNumber(creditCoverDetailsElement, 'OrderNr'),
            },
            MsgText: getElementText(root, 'MsgText'),
        };
        // Create and return a new instance with the parsed data.
        return new MSG05(data);
    }

    /**
     * Getter for the requested new credit cover amount.
     * @returns {number} The new credit cover amount.
     */
    getNewCreditCoverAmount() {
        return this.creditCoverDetails.NewCreditCoverAmt;
    }

    /**
     * Getter for the buyer's country code.
     * @returns {string} The buyer's country code.
     */
    getBuyerCountry() {
        return this.buyer.Country;
    }

    /**
     * Getter for the net payment terms.
     * @returns {number} The net payment terms in days.
     */
    getCreditCoverNetPmtTerms() {
        return this.creditCoverDetails.NetPmtTerms;
    }
}

/**
 * MSG07 Class: Credit Cover Update/Status
 * Represents an MSG07 message, which communicates an update or status about a credit cover.
 * This can include approvals, denials, modifications, or expirations of credit lines.
 */
export class MSG07 extends Message {
    /**
     * Constructs a new MSG07 instance from parsed XML data.
     * @param {object} data - An object representing the parsed XML structure for MSG07.
     * @param {object} data.MsgInfo - Message metadata.
     * @param {string} data.MsgInfo.SenderCode
     * @param {string} data.MsgInfo.ReceiverCode
     * @param {string} data.MsgInfo.CreatedBy
     * @param {number} data.MsgInfo.SequenceNr
     * @param {string} data.MsgInfo.DateTime
     * @param {number} data.MsgInfo.Status
     * @param {object} data.EF - Export Factor details.
     * @param {string} data.EF.FactorCode
     * @param {string} data.EF.FactorName
     * @param {object} data.IF
     * @param {string} data.IF.FactorCode
     * @param {string} data.IF.FactorName
     * @param {string} data.RequestDate
     * @param {string} data.RequestNr
     * @param {number} data.MsgFunction
     * @param {object} data.Seller - Seller details.
     * @param {string} data.Seller.SellerNr
     * @param {string} data.Seller.SellerName
     * @param {object} data.Buyer - Buyer details.
     * @param {string} data.Buyer.BuyerNr
     * @param {string} data.Buyer.BuyerName
     * @param {object} data.CurrentCreditCoverDetails - Details about the existing credit cover.
     * @param {number} data.CurrentCreditCoverDetails.CurrentCreditCoverAmt
     * @param {string} data.CurrentCreditCoverDetails.Currency
     * @param {object} data.NewCreditCoverDetails - Details about the new or updated credit cover.
     * @param {number} data.NewCreditCoverDetails.Request
     * @param {number} data.NewCreditCoverDetails.NewCreditCoverAmt
     * @param {string} data.NewCreditCoverDetails.ValidFrom
     * @param {number} data.NewCreditCoverDetails.LongCreditPeriodDays
     * @param {object} [data.OwnRiskNewCreditCover] - Optional details about own risk.
     * @param {string} [data.MsgText] - Optional free text message.
     */
    constructor(data) {
        // Set up the base message properties.
        const type = 'MSG07';
        const timestamp = data.MsgInfo.DateTime;
        const senderId = data.MsgInfo.SenderCode;

        // Initialize the base class and the payload, and assign all data to instance properties
        // for direct and easy access.
        super(type, timestamp, senderId, data);

        this.msgInfo = data.MsgInfo;
        this.ef = data.EF;
        this._if = data.IF;
        this.requestDate = data.RequestDate;
        this.requestNr = data.RequestNr;
        this.msgFunction = data.MsgFunction;
        this.seller = data.Seller;
        this.buyer = data.Buyer;
        this.currentCreditCoverDetails = data.CurrentCreditCoverDetails;
        this.newCreditCoverDetails = data.NewCreditCoverDetails;
        // Ensure optional properties have a default value to prevent runtime errors.
        this.ownRiskNewCreditCover = data.OwnRiskNewCreditCover || {};
        this.msgText = data.MsgText || '';
    }

    /**
     * Static factory method to create an MSG07 instance from a raw XML string.
     * Encapsulates the parsing logic for this specific message type.
     * @param {string} xmlString - The XML string representing an MSG07 message.
     * @returns {MSG07} A new MSG07 instance.
     * @throws {Error} If XML parsing fails or required data is missing.
     */
    static fromXMLString(xmlString) {
        // Use the browser's standard DOMParser.
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Check for a parser-generated error node, which indicates malformed XML.
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            console.error('XML Parsing Error:', errorNode.textContent);
            throw new Error('Failed to parse XML string.');
        }

        // Reusable helper to safely extract text content.
        const getElementText = (element, tagName) => {
            const node = element.querySelector(tagName);
            return node ? node.textContent : null;
        };

        // Reusable helper to safely extract and convert to a number.
        const getElementNumber = (element, tagName) => {
            const text = getElementText(element, tagName);
            return text !== null && text !== '' ? Number(text) : null;
        };

        // Validate the presence of the root element.
        const root = xmlDoc.querySelector('MSG07');
        if (!root) {
            throw new Error('Invalid MSG07 XML structure: Root <MSG07> element not found.');
        }

        // Locate all major sections of the XML to ensure the structure is valid.
        const msgInfoElement = root.querySelector('MsgInfo');
        const efElement = root.querySelector('EF');
        const ifElement = root.querySelector('IF');
        const sellerElement = root.querySelector('Seller');
        const buyerElement = root.querySelector('Buyer');
        const currentCreditCoverDetailsElement = root.querySelector('CurrentCreditCoverDetails');
        const newCreditCoverDetailsElement = root.querySelector('NewCreditCoverDetails');

        // This validation step is crucial. It confirms that the XML document has the expected
        // high-level structure before we try to access deeper, nested data.
        if (!msgInfoElement || !efElement || !ifElement || !sellerElement || !buyerElement || !currentCreditCoverDetailsElement || !newCreditCoverDetailsElement) {
            throw new Error('Missing required elements in MSG07 XML.');
        }

        const data = {
            MsgInfo: {
                SenderCode: getElementText(msgInfoElement, 'SenderCode'),
                ReceiverCode: getElementText(msgInfoElement, 'ReceiverCode'),
                CreatedBy: getElementText(msgInfoElement, 'CreatedBy'),
                SequenceNr: getElementNumber(msgInfoElement, 'SequenceNr'),
                DateTime: getElementText(msgInfoElement, 'DateTime'),
                Status: getElementNumber(msgInfoElement, 'Status'),
            },
            EF: {
                FactorCode: getElementText(efElement, 'FactorCode'),
                FactorName: getElementText(efElement, 'FactorName'),
            },
            IF: {
                FactorCode: getElementText(ifElement, 'FactorCode'),
                FactorName: getElementText(ifElement, 'FactorName'),
            },
            RequestDate: getElementText(root, 'RequestDate'),
            RequestNr: getElementText(root, 'RequestNr'),
            MsgFunction: getElementNumber(root, 'MsgFunction'),
            Seller: {
                SellerNr: getElementText(sellerElement, 'SellerNr'),
                SellerName: getElementText(sellerElement, 'SellerName'),
            },
            Buyer: {
                BuyerNr: getElementText(buyerElement, 'BuyerNr'),
                BuyerName: getElementText(buyerElement, 'BuyerName'),
            },
            CurrentCreditCoverDetails: {
                CurrentCreditCoverAmt: getElementNumber(currentCreditCoverDetailsElement, 'CurrentCreditCoverAmt'),
                Currency: getElementText(currentCreditCoverDetailsElement, 'Currency'),
            },
            NewCreditCoverDetails: {
                Request: getElementNumber(newCreditCoverDetailsElement, 'Request'),
                NewCreditCoverAmt: getElementNumber(newCreditCoverDetailsElement, 'NewCreditCoverAmt'),
                ValidFrom: getElementText(newCreditCoverDetailsElement, 'ValidFrom'),
                LongCreditPeriodDays: getElementNumber(newCreditCoverDetailsElement, 'LongCreditPeriodDays'),
            },
            OwnRiskNewCreditCover: root.querySelector('OwnRiskNewCreditCover') ? {} : null, // Empty if exists, null if not
            MsgText: getElementText(root, 'MsgText'),
        };
        // Create and return a new instance with the parsed data.
        return new MSG07(data);
    }

    /**
     * Getter for the current credit cover amount.
     * @returns {number} The current credit cover amount.
     */
    getCurrentCreditCoverAmount() {
        return this.currentCreditCoverDetails.CurrentCreditCoverAmt;
    }

    /**
     * Getter for the new credit cover amount.
     * @returns {number} The new credit cover amount.
     */
    getNewCreditCoverAmount() {
        return this.newCreditCoverDetails.NewCreditCoverAmt;
    }

    /**
     * Getter for the buyer's name.
     * @returns {string} The buyer's name.
     */
    getBuyerName() {
        return this.buyer.BuyerName;
    }
}