import json
import urllib3


def lambda_handler(event, context):
    try:
        operation = event['requestContext']['http']['method']
        origin = event['headers']['origin']
    except Exception as e:
        print('exception', e)
        raise e

    if operation != 'POST':
        if operation != 'OPTIONS':
            return {
                'statusCode': 405,
                'body': 'Wrong method.'
            }

        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,X-Amz-Security-Token,Authorization,"
                                                "X-Api-Key,X-Requested-With,Accept,Access-Control-Allow-Methods,"
                                                "Access-Control-Allow-Origin,Access-Control-Allow-Headers",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "X-Requested-With": "*"
            },
            'body': 'Accept'
        }

    authorized_origins = [] # The origins to allow

    if origin not in authorized_origins:
        return {
            'statusCode': 403,
            'body': 'You are not allowed to make this request.'
        }

    request_body = json.loads(event['body'])

    direction = get_directions(request_body)

    return {
        'statusCode': 200,
        'body': json.dumps(direction)
    }


def get_directions(request):
    api_key = "" # Your API key
    params = f"origin={request['origin']}&destination={request['destination']}&mode={request['transport_mode']}"
    if request['arrival_time'] != "":
        params += f"&arrival_time={request['arrival_time']}"

    url = f"https://maps.googleapis.com/maps/api/directions/json?{params}&language=en&key={api_key}"

    http = urllib3.PoolManager()
    response = http.request('GET', url).data.decode()

    return json.loads(response)
