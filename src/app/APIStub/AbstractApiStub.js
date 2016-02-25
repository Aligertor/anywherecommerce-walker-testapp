var EventEmitter = require('events').EventEmitter;
var Util = require('../util/Util');

var $ = require('jquery');

/**
 * this is an Abscract API Stub in the sense that it is not capable of performing the initilizing steps needed to perform calls against the box or a server in the cloud
 * the concrete APIStubs that perform call against one or the other have to be derived from this class
 */

var AbstractApiStub = Util.merge({
    /** Type of this device (default '1' means web browser) */
    device_type: 1,
    /** Device object returned by API */
    device: null,
    
    /** load_owner response (since we do a login call automaticly after owner loaded we want to store its result until we cann pass it with the event after the login)**/
    load_owner_res: {},
   
    /** the options which the APIStub was initiaziled with */
    options: null,

    /**
     * this actually does the calls against the 'balck box'
     * @param  {String}   squib    the name of the squib call we wanna do
     * @param  {Object}   params   the params to pass
     * @param  {Function} callback the callback we wanna execute on success
     * @param  {bool}     async    ture for assyncrone calls 
     */
    call_api: function(squib, params, callback, async, isMultipart){
        var url = this.options.baseURL + squib;
        var data = params;
        var ajaxOpts = {
                    url: url,
                    type: 'POST',
                    data: params,
                    dataType: 'json',
                    async: async,
                    success: function(json) {
                        callback(json.body);
                    },
                    error: function(jqXHR, textStatus) {
                        callback({errors: ['Please check your internet connection.']});
                    }
                };

        if (isMultipart) {
            var formData = new FormData();
            for(var key in data) {
                formData.append(key, data[key]);
            }
            ajaxOpts.data = formData;
            ajaxOpts.cache = false;
            ajaxOpts.contentType = false;
            ajaxOpts.processData = false;
        }


        $.ajax(ajaxOpts);
    },
    
    /**
     * Reduces the item to the bare minimum the 'balck box' needs to identify it
     * @param item {Object} the original item
     */
    reduceItem: function (item){
        return {
            'asset_id': item.asset_id,
            'base': item.base
        };
    },
    
    /**
     * Reduces the item but takes care that the Options are added too
     * this method is not used currently but may be usefull again
     * @param item {Object} the original item
     */
    reduceItemWithOptions: function (item){
    
        var minimumItem = this.reduceItem(item);
        
        if(item.options){
            minimumItem.options = item.options;
        }
        
        return minimumItem;
    },
    
    /**
     * Reduces the Line to the bare minimum the 'balck box' needs to update it
     * so far no options are reduced in depth only properties on the first level will be teaken care of
     * @param lineItem {Object} the original item
     */
    reduceLineItem: function (lineItem){
        //lineItem.options is an object but we dont need a deep copy here?!
        return {
            'asset_id': lineItem.asset_id,
            'liid': lineItem.liid,
            'base': lineItem.base,
            'order_id': lineItem.order_id,
            'options': lineItem.options
        };
    
    },
    
    /**
     * Informs the 'black box' that an order is started
     * @param {Object} item             an item to be added
     * @param {number} serviceType      (optional) the service type the order should have. see: Util.serviceTypes
     */
    startOrder: function (items,serviceType){
        var reducedItems = [];
    
        if (!items) {
            return false;
        }

        //if not set make sure we set a default value if no servicetype is set
        if(!serviceType){
            serviceType = Util.serviceTypes.SERVICE_TYPE_PICKUP;
        }

        items.forEach(function(item) {
            reducedItems.push(this.reduceItem(item));
        }, this);
        
        var params = {
            s: serviceType,
            reg: this.device.register_id,
            i: JSON.stringify(reducedItems)
        };

        this.call_api(
            'squib_start_order',
             params,
             this.CB_start_order.bind(this), 
             true
        );
    
    },
    
    /**
     * Callback for starting a new order.
     * @param {Object} res Server response
     */
    CB_start_order: function (res) {
        this.emit('ORDER_STARTED', res);
    },
    
    /**
     * Adds items to a given order
     * @param order_id      the id of the order to add the item too
     * @param items {Array} Array of itema to add
     */
    addItems: function(order_id, items){
        var reducedItems = [];

        items.forEach(function(item) {
            reducedItems.push(this.reduceItemWithOptions(item));
        }, this);
    
        var params = {
            b: this.load_owner_res.base,
            o: order_id,
            i: JSON.stringify(reducedItems)
        };
    
        this.call_api(
            'squib_add_items',
            params,
            this.CB_add_items.bind(this), 
            true
        );
    },
    
    /**
     * Callback for adding items
     * @param {Object} res Server response
     */
    CB_add_items: function(res){
        this.emit('ORDER_ITEMS_ADDED', res);
    },
    
    /**
     * Saves the status of an item that was already added to the order
     * @param lineItem {Obejct} the new version o the lineitem
     */
    saveItem: function(lineItem){
        
        delete lineItem.edit_history;
        delete lineItem.status_history;
        
        var reducedItem = this.reduceLineItem(lineItem);
        
        var params = {
            i: JSON.stringify([reducedItem])
        };
        
        this.call_api(
            'squib_save_item',
            params,
            this.CB_saved_item.bind(this), 
            true
        );
    },
    
    /**
     * Callback for modifying items.
     * @param {Object} res Server response
     */
    CB_saved_item: function(res){
        this.emit('ORDER_ITEMS_SAVED', res);
    },
    
    /**
     * adds items to a given order
     * @param order_id      the id of the order to add the item too
     * @param lineItemId {String}   line item id to remove from the order
     */
    cancelItem: function(order_id,lineItemId){
        var params = {
            b: this.load_owner_res.base,
            o: order_id,
            l: lineItemId
        };
        
        this.call_api(
            'squib_cancel_items',
            params,
            this.CB_cancel_item.bind(this), 
            true
        );
    },
    
    /**
     * Callback for cancelling LineItems from order.
     * @param {Object} res Server response
     */
    CB_cancel_item: function(res){
        this.emit('ORDER_ITEM_CANCELLED', res);
    },
    
    /*
     * changes the status of LineItems
     * @param base {String}             the base ...
     * @param order_id {String}         the id of the order with the lineitems have to be updated
     * @param liids {array(numbers)}    the ids of the lineitems to be changed
     * @param status {number}           the new status of these items e.g.
     *                      STATUS_ORDERED: 2 ??
     *                      STATUS_PREPARED: 4
     *                      STATUS_STAGED: 5
     *                      STATUS_DELIVERED: 6
     *                
     */
    changeItemsStatus: function(base,order_id,liids,status){

        var params = {
            b: this.load_owner_res.base,
            o: order_id, 
            s: status
        };
        
        //lets add the liids one by one to our params
        liids.forEach(function(liid,index) {
            var propname = 'l[' + index + ']';
            params[propname] = liid;
        });
        
        this.call_api('squib_mark_item_status',
            params,
            this.CB_mark_item_status.bind(this), true);
    },
    
    CB_mark_item_status: function(res){
        this.emit('ORDER_ITEM_STATUS_SAVED', res);
    },

    /**
     * [changeOrderServiceType description]
     * @param  {[type]} order_id    [description]
     * @param  {[type]} serviceType [description]
     * @return {[type]}             [description]
     */
    changeOrderServiceType: function(order_id,serviceType){
        var params = {
            b: this.load_owner_res.base,
            o: order_id, 
            s: serviceType
        };


        this.call_api('squib_set_order_service_type',
            params,
            this.CB_set_order_service_type.bind(this), true);
    },

    CB_set_order_service_type: function(res){
        this.emit('ORDER_SAVED', res);
    },

    /**
     * set the delivery details for an oder - if the order is not in SERVICE_TYPE_DELIVERY this state will be enofrced by this method
     * @param {String} order_id     the id of the order
     * @param {Object} details      the delivery details see: http://c1.tp-devel.com/admin/apidocs/class_delivery_details.html 
     */
    setDeliveryAddress: function(order_id, details) {
         var params = {
            b: this.load_owner_res.base,
            o: order_id, 
            s: Util.serviceTypes.SERVICE_TYPE_DELIVERY,
            d: JSON.stringify(details)
        };


        this.call_api('squib_set_order_service_type',
            params,
            this.CB_set_order_delivery_address.bind(this), true);
    },

    CB_set_order_delivery_address: function (res) {
        this.emit('ORDER_SAVED', res);
    },
    
    /**
     * advances an order to prep (e.g. for mobile orders)
     * @param  {String} order_id the id of the order to advance
     */
    prepEarly: function (order_id) {

        var params = {
            b: this.load_owner_res.base,
            o: order_id
        };


        this.call_api('squib_early_prep',
            params,
            this.CB_set_order_prep_early.bind(this), true);
    },

    CB_set_order_prep_early: function (res) {
        this.emit('ORDER_SAVED', res);
    },

    /**
     * Saves order_notes and table_notes of the order 
     * @param {String} order_id
     * @param {String} orderNotes
     * @param {String} tableNotes
     */
    saveOrderNotes: function(order_id, orderNotes, tableNotes) {
        var params = {
            b: this.load_owner_res.base,
            o: order_id,
            on: orderNotes,
            tn: tableNotes
        };

        this.call_api('squib_save_order_notes',
            params,
            this.CB_save_order_notes.bind(this), true);
    },

    CB_save_order_notes: function(res) {
        this.emit('ORDER_NOTES_SAVED', res);
    },

    getOrder: function(order_id) {
        var params = {
            b: this.load_owner_res.base,
            o: order_id
        };

        this.call_api('squib_get_order',
            params,
            this.CB_get_order.bind(this), true);
    },

    CB_get_order: function (res) {
        this.emit('ORDER_LOADED', res);
    },

    /**
     * returns customer feedback to the box
     * @param  {Object} id         the id for an visit (asset_id) or the order_id in an object like {a: my_asset_id} or {o: my_asset_id} or { payment_id: payment_id}
     * @param  {Object} payload    optional object with the information to pass (see: http://c1.tp-devel.com/admin/apidocs/squib_calls.html for more information)
     */
    giveFeedback: function(id, payload) {
        var params = {
            b: this.load_owner_res.base
        };

        if(id.o != null){
           params.o = id.o;  
        } 
        if(id.a != null){
           params.a = id.a;  
        }

        if(id.payment_id != null){
           params.payment_id = id.payment_id;  
        }

        if(payload){
            Object.keys(payload).forEach(function(key) {
                    if(key === 'metrics'){
                        params[key] = JSON.stringify(payload[key]);     
                    }else{
                        params[key] = payload[key];       
                    }
                }, this);
        }

        this.call_api('squib_loyalty_feedback',
            params,
            this.CB_squib_loyalty_feedback.bind(this), true);
    },

    CB_squib_loyalty_feedback: function (res) {
        this.emit('FEEDBACK_RECORDED', res);
    },

    
    /**
     * Create a bill
     * This call is used from the stand alone Billing App
     * @param  {Number} amount            the total amount of the bill in cents
     * @param  {Number} table             the number/id of the table
     * @param  {number} numberOfCustomers the number of Covers that will be payed with the bill
     */
    startBill: function (amount, table, numberOfCustomers) {

        var params = {
            t: table,
            a: amount,
            c: numberOfCustomers,
            r: this.device.register_id
        };

        this.call_api('squib_start_bill',
            params,
            this.CB_squib_start_bill.bind(this), true);
    },

    /**
     * starts an order from a ticket
     * @param  {String} ticket_id 
     */
    startBillFromTicket: function(ticket_id) {
        var params = {
            r: this.device.register_id,
            pt: ticket_id
        };

        this.call_api('squib_start_bill',
            params,
            this.CB_squib_start_bill.bind(this), true);
    },

    CB_squib_start_bill: function (res) {
        this.emit('BILL_STARTED', res);
    },

    /**
     * starts an order from a tickets
     * @param  {Array[String]} ticket_ids   Array of ticket ids
     */
    startBillFromTickets: function(ticket_ids) {
        var params = {
            r: this.device.register_id
        };

        for (var i = 0; i < ticket_ids.length; i++) {
            params['pt[' + i + ']'] = ticket_ids[i];
        }

        this.call_api('squib_start_bill',
            params,
            this.CB_squib_start_bills.bind(this), true);
    },

    CB_squib_start_bills: function (res) {
        this.emit('BILLS_STARTED', res);
    },

    /**
     * close an order when the processing was finished sucessfully
     * the server needs to be informed about orderd/bills that are canceled to track its status properly so this order/bill will have the correct state when fetched via some other methods
     * @param  {string} order_id
     */
    closeBill: function(order_id) {
        var params = {
            o: order_id
        };

        this.call_api('squib_close_order',
            params,
            this.CB_squib_close_order.bind(this), true);
    },

    CB_squib_close_order: function (res) {
        this.emit('BILL_CLOSED', res);
    },

    /**
     * close multiple bills at once
     * @param  {Array[String]} order_ids  array of order_id´s
     */
    closeBills: function (order_ids){
        var params = {};

        for (var i = 0; i < order_ids.length; i++) {
            params['o[' + i + ']'] = order_ids[i];
        }

        this.call_api('squib_close_order',
            params,
            this.CB_squib_close_orders.bind(this), true);
    },

    CB_squib_close_orders: function (res) {
        this.emit('BILLS_CLOSED', res);
    },

    /**
     * sets the gratuity for an order
     * @param {String} order_id the id of the order
     * @param {[type]} gratuity [description]
     */
    setGratuity: function (order_id,gratuity){
        var params = {
            o: order_id,
            g: gratuity
        };

        this.call_api('squib_set_gratuity',
            params,
            this.CB_squib_set_gratuity.bind(this), true);
    },

    CB_squib_set_gratuity: function (res){
        this.emit('GRATUITY_ADDED',res);
    },

    /**
     * method for credit card payment
     * @param  {String} order_id     the id of the order we want to pay
     * @param  {Number} amount       the amount to pay in cents
     * @param  {Number} gratuity     the gratuity in cents   
     * @param  {Object} raw_data     the Data we get from the Card Reader
     * @param  {bool} allow_partial  should we allow partial payments
     */
    processPayment: function (order_id, amount,gratuity, raw_data,split_id,allow_partial) {

        var payment_data = {
            amount: parseInt(amount) + parseInt(gratuity),
            gratuity: parseInt(gratuity),
            card: {
                rawData: raw_data,
                encryptedFormat: 0
            }
        };


        if(!isNaN(split_id)){
            payment_data.split_id = split_id; 
        }

        var params = {
            o: order_id,
            r: this.device.register_id,
            t: JSON.stringify(payment_data)
        };

        if (allow_partial !== undefined) {
            params.ap = (allow_partial ? 1 : 0);
        }

        this.call_api('squib_process_payment',
            params,
            this.CB_squib_process_payment.bind(this), true);
    },

    CB_squib_process_payment: function (res){
        this.emit('ORDER_PAYMENT_COLLECTED_CARD', res);
    },

    processPaymentSignature: function(order_id, payment_id, signature) {

        var params = {
            o: order_id,
            r: this.device.register_id,
            p: payment_id,
            sig: signature
        };

        this.call_api('squib_process_payment',
            params,
            this.CB_squib_process_payment_signature.bind(this), true, true);

    },

    CB_squib_process_payment_signature: function(res) {
        this.emit('ORDER_PAYMENT_SIGNATURE_SAVED', res);
    },

    /**
     * does payment for the givven order
     * @param order_id {String} the id of the order wich should be payed
     * @param amount {int}  the part of the bill in cent which will be payed
     * @param gratuity {int}   the gratuity in cent
     */
    payCash: function(order_id,amount,gratuity,split_id){
        var params = {
            r: this.device.register_id,
            o: order_id,
            t: 0,
            a: parseInt(amount)
        };
        
        if(gratuity){
            params.a += parseInt(gratuity);
            params.g = parseInt(gratuity);
        }

        if(!isNaN(split_id)){
            params.s = parseInt(split_id);
        }

        this.call_api('squib_collect_payment',
            params,
            this.CB_collect_payment.bind(this), 
            true
        );
    },
    
    /**
     * Callback for regtistering payments collection on server.
     * @param {Object} res Server response
     */
    CB_collect_payment: function(res){
        this.emit('ORDER_PAYMENT_COLLECTED_CASH', res);
    },

    refundPayment: function (order_id, payment_id, amount) {

        var params = {
            r: this.device.register_id,
            o: order_id,
            p: payment_id,
            a: parseInt(amount)
        };

        this.call_api('squib_refund_payment',
            params,
            this.CB_refund_payment.bind(this), 
            true
        );
    },

    CB_refund_payment: function (res) {
        this.emit('ORDER_PAYMENT_REFUNDED', res);
    },

    /**
     * does payment for the givven order - the payment will be done with reward points - no gratuity can be payed this way
     * @param order_id {String} the id of the order wich should be payed
     * @param amount {int}  the part of the bill in cent which will be payed
     * @param customer_base {String} the id/base of the customer
     */
    applyRewardPoints: function(order_id,amount,customer_base,split_id){
        var params = {
            r: this.device.register_id,
            c: customer_base,
            o: order_id,
            t: 8,
            a: amount
        };

        if(!isNaN(split_id)){
            params.s = split_id; 
        }

        this.call_api('squib_collect_payment',
            params,
            this.CB_collect_payment_rewardpoints.bind(this), 
            true
        );
    },
    
    /**
     * Callback for regtistering payments collection on server.
     * @param {Object} res Server response
     */
    CB_collect_payment_rewardpoints: function(res){
        this.emit('OFFER_APPLIED', res);
    }

}, EventEmitter.prototype);

module.exports = AbstractApiStub;