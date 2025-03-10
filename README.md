# sinchChat application (Sinch take home test)
The goal of this project is to implement a service which would support a client side chat feature.

This system allows the user to register in the system simply by typing a userName. Once the user is registered in the system, it can participate  the chat session. In the mentioned session the messages whichare part of the conversation are fetched in batches. Once the user scrolls up to the top and reach the limit of the batch, a load more button will appear.

The webchat supports several open sessions at the same time. Every time a new message is saved, an event is emitted via redis. All opened websockets are subscribed to the mentioned event and will get updated without the need of reloading the page.

For simplicity this is a unique chat and we assume the server can handle the number of concurrent websockets needed at any given time. In order to make this solution fully scalable, we would need to implement more sofisticated approach using a load balancer supporting sticky sessions and probably a redis cluster. Given the restriction of the system supporting only one conversation, I have not seen the need of creating more than one channel in Redis.

I have opted for DynamoDB to store user sessions and messages. This is a solution that is optimized for this type of application. It autoscales and it is optimized for intense write/reads. Users and Messages are not related since I have asumed once a user logs out, the session will be dropped from the DB however, its messages will still be linked to its userName.

Since the application is simple enough? I am rendering the different components baed on context properties values. If the application would have been more complex, it would scale better to use React router for instance.

## Architecture of the system
![Architecture schema](/assets/Sinch_Chat.png)

## Bootstrap

These steps have been tested to work on MacOS 15.3.1

* Colima 0.8.1
* Docker 28.0.0
* docker-compose 2.33.1
* redis 7.2.7
* node 23.7.0
* npm 10.9.2
* aws-cli 2.24.10
* dynamodb-admin 5.1.3 (Not necessary but recommended to easily query and manage the tables with a UI)

To bootstrap the DynamoDB instance first we will need to start docker. (For reference, the docker-compose.yaml in this project has been created following the instructions provided by AWS https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html).

```bash
  > colima start
  > docker-compose up
```

**NOTE:** It is important to notice than this is a a local version of DynamoDB for development only. The connection strings have been hardcoded as well as the keys which are stored in a file not meant to be commited to git. For production environment, we would need to setup the DynamoDB in AWS environment and make and securely handle the keys.

### Create Users table

```bash
aws dynamodb create-table \ --table-name Users \ --attribute-definitions \ AttributeName=UserName,AttributeType=S \ AttributeName=SessionId,AttributeType=S \ --key-schema \ AttributeName=UserName,KeyType=HASH \ --global-secondary-indexes \ "[ { \"IndexName\": \"GSI_SessionLookup\", \"KeySchema\": [ {\"AttributeName\":\"SessionId\",\"KeyType\":\"HASH\"} ], \"Projection\": {\"ProjectionType\":\"ALL\"} } ]" \ --billing-mode PAY_PER_REQUEST \ --endpoint-url http://localhost:8000
```

### Create Messages table

```bash
aws dynamodb create-table \ --table-name Messages \ --attribute-definitions \ AttributeName=PartitionKey,AttributeType=S \ AttributeName=CreatedAt,AttributeType=S \ --key-schema \ AttributeName=PartitionKey,KeyType=HASH \ AttributeName=CreatedAt,KeyType=RANGE \ --billing-mode PAY_PER_REQUEST \ --endpoint-url http://localhost:8000
```

### Start Redis

```bash
brew services start redis
```

### Install dependencies
#### Root, server and client

```bash
  > npm install
```

### Start Frontend client and BE server

In the root directory run:

```bash
  > npm run dev
```

## Run tests
<root_dir>/client && <root_dir>/packages/server

```bash
npm test
```