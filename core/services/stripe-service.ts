import { StripeStandardAddress, StripeStandardConfig, StripeStandardShippingMethod } from "@triniwiz/nativescript-stripe/standard";
import { CardParams, PaymentMethod, Stripe } from "@triniwiz/nativescript-stripe";
import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"

export class StripeService {
    private _requestService: RequestService;
    public _publishableKey: string;
    private _stripe: Stripe;

    constructor() {
        const that = this;
        that._requestService = new RequestService(Configuration.okamApiBaseUrl);

        that.getPublishableKey().then((publishableKey) => {
            StripeStandardConfig.shared.publishableKey = publishableKey;
            StripeStandardConfig.shared.companyName = "Okam AS";
            that._stripe = new Stripe(publishableKey);
        })
    }

    public async getPublishableKey(): Promise<string> {
        if (this._publishableKey) return this._publishableKey;
        let response = await this._requestService.getRequest('/payment/secret/');
        if (!response || !response.content || response.statusCode != 200)
            throw new Error("Kunne ikke kobles mot betalingsleverandør");

        this._publishableKey = response.content.toString()

        return this._publishableKey
    }

    public async getPaymentMethods(storeId: number): Promise<any> {
        let response = await this._requestService.getRequest('/payment/paymentMethods/'+ storeId);
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined) throw new Error("Kunne ikke hente kort");
        return parsedResponse
    }

    public async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
        let response = await this._requestService.deleteRequest('/payment/paymentMethod/' + paymentMethodId);
        return response && response.statusCode === 200
    }

    public async createPaymentIntent(amount: number, currency: string, paymentMethodId: string, cartId: string, setupFutureUsage: boolean): Promise<any> {
        let response = await this._requestService.postRequest('/payment/createPaymentIntent/', {
            amount,
            currency,
            paymentMethodId,
            cartId,
            setupFutureUsage
        });

        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined) throw new Error("Betalingen ikke ikke gjennomføres på dette tidspunktet");
        return parsedResponse
    }

    public async createPaymentMethod(number: string, expMonth: number, expYear: number, cvc: string): Promise<PaymentMethod> {
        const that = this;
        return new Promise((resolve, reject) => {
            var card = new CardParams(number, expMonth, expYear, cvc);
            that._stripe.createPaymentMethod(card, (error, pm) => {
                if (error) return reject(error);
                resolve(pm);
            });
        });
    }

    private encodeShipping(method: StripeStandardShippingMethod, address: StripeStandardAddress): string {
        function entry(label: string, value: string): string {
            return value ? encodeURI(label) + "=" + encodeURI(value) : "";
        }
        return entry("shipping[carrier]", method.label) +
            entry("&shipping[name]", address.name) +
            entry("&shipping[address][line1]", address.line1) +
            entry("&shipping[address][line2]", address.line2) +
            entry("&shipping[address][city]", address.city) +
            entry("&shipping[address][state]", address.state) +
            entry("&shipping[address][country]", address.country) +
            entry("&shipping[address][postal_code]", address.postalCode) +
            entry("&phone", address.phone) +
            entry("&email", address.email);
    }
}