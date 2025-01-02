# Custom SFRA Conversational Product Finder

This is a prototype for an e-commerce conversational Product Finder to provide a new way of discovering products.
It implements a combination of Salesforce solutions to achieve this, including the Agentforce platform.

It is based on:

- Salesforce Data Cloud for the catalog data.
- Salesforce Agentforce for the Gen AI capabilities.
- Salesforce Service Cloud Messaging for In-App & Web (MIAW) for the chat features.
- Salesforce B2C Commerce for the e-commerce storefront.

**Disclaimer:**
This package is intended to demonstrate and illustrate the Salesforce Agentforce capabilties applied to e-commerce use cases on Salesforce B2C Commerce (aka Commerce Cloud, aka Demandware). It is not intended to be used in a production environment as is.

## Technical Overview

1. Data ingestion:

- Product catalog is in `./assets/data/kiehls-product-catalog.csv`.
- The _Product Info_ field is designed to be the target for embedding generation. It concatenates fields _Name_, _Subtitle_, _Description_, _Good For_.
- The CSV is ingested into Data Cloud from an AWS S3 bucket.
- CSV data is mapped to a new DMO adapted from the Master Product DMO, enriched with new fields for the product information.
- A Search Index is configured on the _Product Info_ field.

2. Agent Topic:

- The configuration is provided in `./assets/agent/agent-topic.txt`.
- A single topic handles how the agent should behave, in particular by asking questions to determine the shopper's needs.
- One instruction tells the LLM to return product information as a JSON object, so it can be parsed and rendered as a carousel on the storefront.

3. Agent Action:

- The APEX called by the action is in `./assets/apex/KiehlsProductVectorSearchServiceV3.apxc`.
- The APEX is designed to perform a `vector_search` against the indexed data, and to return additional fields.

4. MIAW Configuration:

- The Embedded Service Deployment is a MIAW Custom Client.

5. Implementation on B2C Commerce Storefront

- The implementation is contained in cartridge `./cartridges/custom_sfra_miaw`.
- The MIAW API calls and rendering are managed by a single React component in `./cartridges/custom_sfra_miaw/cartridge/client/default/react_v3/MiawChatV3.jsx`.
- The Server-Sent Events endpoint in the MIAW REST API must go through a proxy - see repo https://github.com/aperelgritz/sse-cors-proxy
- The product finder is implemented in a controller `Miaw-StartV3` that renders a template `chat_v3.isml`.

6. Use the Product Finder!

- Call the controller `Miaw-StartV3`.

## Deployment

### Data Cloud

- Go to _Data Model_ tab > _New_ > _From Existing_
- Select _Master Product_ > _Next_
- Update _Object Label_ to your own name (eg. _Master Product Kiehls_)
- Update _Object API Name_ to your own API name (eg. _Master_Product_Kiehls_)
- Add fields:
  - Product Description / Description\_\_c / Text
  - Product Good For / ProductGoodFor\_\_c / Text
  - Product How to Use / ProductHowtoUse\_\_c / Text
  - Product Image URL / ProductImageURL\_\_c / Text
  - Product Info / ProductInfo\_\_c / Text
  - Product Key Ingredients / ProductKeyIngredients\_\_c / Text
  - Product Price / ProductPrice\_\_c / Text
  - Product Subtitle / ProductSubtitle\_\_c / Text
  - Product URL / ProductURL\_\_c / Text
  - Product Whats Inside / ProductWhatsInside\_\_c / Text
- Ingest CSV from you AWS S3 bucket.
- Map the CSV columns to the DMO fields.
- Create a Search Index on the _Product Info_ field
- Test the SQL query works in the Query Editor (replace with your own table names):

```
SELECT score__c AS Score, PID__c AS "Product ID", Price__c AS "Product Price", URL__c AS "Product URL", Chunk__c AS "Chunk", Image_URL__c AS "Image URL"
FROM vector_search(TABLE(Master_Product_Kiehls_v2_index__dlm), 'show me gift sets', '', 20) v
JOIN Master_Product_Kiehls_v2_chunk__dlm c ON v.RecordId__c = c.RecordId__c
JOIN output15_merged_and_separate_csv__dll d ON c.SourceRecordId__c = d.PID__c
ORDER BY v.score__c DESC
```

### Apex

- Open _Developer Console_
- _File_ > _New_ > _Apex Class_
- Paste the code contained in `./assets/apex/KiehlsProductVectorSearchServiceV3.apxc`
- Double check the SQL query
- Test the class:
  - _Debug_ > _Open Execute Anonymous Window_
  - Paste the the following code:

```
// Create an instance of the input class with the desired search term
KiehlsProductVectorSearchServiceV3.SearchRequest searchReq = new KiehlsProductVectorSearchServiceV3.SearchRequest();
searchReq.searchTerm = 'show me sunscreens'; // Replace with your desired input

// Add the search request to a list as the invocable method expects a list of inputs
List<KiehlsProductVectorSearchServiceV3.SearchRequest> searchRequests = new List<KiehlsProductVectorSearchServiceV3.SearchRequest>();
searchRequests.add(searchReq);

// Call the invocable method with the list of search requests
List<KiehlsProductVectorSearchServiceV3.SearchResponse> searchResponses = KiehlsProductVectorSearchServiceV3.searchKiehlsProducts(searchRequests);

// Iterate through each response and display the results
for(KiehlsProductVectorSearchServiceV3.SearchResponse response : searchResponses) {
    System.debug('Search Term: ' + response.input);

    if(response.results != null && !response.results.isEmpty()) {
        System.debug('Search Results:');

        for(KiehlsProductVectorSearchServiceV3.ProductResult product : response.results) {
            System.debug('---------------------------------------');
            System.debug('Product ID: ' + product.productId);
            System.debug('Product Price: ' + product.productPrice);
            System.debug('Product URL: ' + product.productURL);
            System.debug('Chunk: ' + product.chunk);
            System.debug('Product Image: ' + product.productImageURL);
        }

        System.debug('---------------------------------------');
        System.debug('Total Products Found: ' + response.results.size());
    } else {
        System.debug('No products found for the search term: ' + response.input);
    }
}
```

- Click _Execute_
- Check the logs and make sure you see the product output.

### Agent Configuration

- _Setup_ > _Agents_ > _New Agent_
- Enter your own _Label Name_, _API Name_, _Description_
- _Agent User_:
  - Custom Agent User
  - Select an admin user
- _Create_
- _New Topic_ > Copy the configuration in `./assets/agent/agent-topic.txt`
- Add _Topic Action_ > _Apex_ > Select the class created above (eg. _Search Kiehls Products V3_)

### MIAW Configuration

- _Setup_ > _Routing Configurations_ > _New_
  - Name: MIAW
  - Dev name: MIAW
  - Routing Priority: 0
  - Routing Model: Most Available
  - Capacity Type: Inherited
  - Units of Capacity: 100.00
- _Setup_ > _Queues_ > _New_:
  - Label: Commerce Queue
  - Queue name: Commerce_Queue
  - Routing Configuration: MIAW
  - Supported Objects: Messaging Session
- _Setup_ > _Flows_ > _New Flow_
  - Start from Scratch > Omni-Channel Flow
  - New Resource
    - Resource Type: Variable
    - API Name: recordId
    - Data Type: Text
    - Available for input: checked
  - Add Element > Route Work:
    - "Route to Kiehls Product Finder Apex v3"
    - Single
    - {!recordId}
    - Service Channel: Messaging
    - Route to: Agentforce Service Agent
    - Agentforce Service Agent: Kiehls Product Finder Apex v3
    - Fallback Queue:
      - Select Queue
      - Commerce Queue
  - Save
    - Label: "Route to Kiehls Product Finder Apex v3"
  - Activate
- _Setup_ > _Messaging Settings_
  - Turn ON
  - New Channel > Select "Messaging for In-App and Web"
  - Channel Name: MIAW for Kiehls Apex v3
  - Developer Name: MIAW_for_Kiehls_Apex_v3
  - Omni-Channel Routing:
    - Routing Type: Omni-Flow
    - Flow Definition: Route to Kiehls Product Finder Apex v3
    - Fallback Queue: Commerce Queue
  - Save
  - Messaging Settings > click "MIAW for Kiehls Apex v3"
    - Activate
- _Setup_ > _Embedded Service Deployments_
  - New Deployment
  - Messaging for In-App & Web
  - Custom Client
  - Embedded Service Deployment Name: MIAW Custom for Kiehls Apex v3
  - API Name: MIAW_Custom_for_Kiehls_Apex_v3
  - Messaging Channel: MIAW for Kiehls Apex v3
  - Save
  - Publish

### B2C Commerce Cartridge

- `git clone git@github.com:aperelgritz/custom-sfra-miaw.git`
- `cd custom-sfra-miaw`
- `npm install`
- `touch .env`
- Edit `.env` and enter your envrionment variables:

```
REACT_APP_API_BASE_URL=https://<your-org-name>.my.salesforce-scrt.com/iamessage/api/v2
REACT_APP_SSE_URL=<your-heroku-sse-proxy>
REACT_APP_ORG_ID=<your-org-id>
REACT_APP_SVC_DEPLOYMENT=<your-embedded-service-deployment-api-name>
```

- `npm run build-react-v3`
- Upload the cartridge to your B2C Commerce sandbox.
- Add the cartridge to your cartridge path (tested with SFRA version 7.0.1).

### Use the Product Finder

- Call the controller `Miaw-StartV3`.
