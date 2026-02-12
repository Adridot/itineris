import json
import os
import urllib3


def lambda_handler(event, context):
    try:
        operation = event['requestContext']['http']['method']
    except Exception as e:
        print('exception', e)
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid request format.'})
        }

    cors_headers = {
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,X-Amz-Security-Token,Authorization,"
                                        "X-Api-Key,X-Requested-With,Accept,Access-Control-Allow-Methods,"
                                        "Access-Control-Allow-Origin,Access-Control-Allow-Headers",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "X-Requested-With": "*"
    }

    if operation == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': 'Accept'
        }

    if operation != 'POST':
        return {
            'statusCode': 405,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Wrong method.'})
        }

    origin = event.get('headers', {}).get('origin', '')
    authorized_origins = os.environ.get('AUTHORIZED_ORIGINS', '').split(',')

    if origin not in authorized_origins:
        return {
            'statusCode': 403,
            'headers': cors_headers,
            'body': json.dumps({'error': 'You are not allowed to make this request.'})
        }

    try:
        request_body = json.loads(event['body'])
    except (json.JSONDecodeError, KeyError):
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid request body.'})
        }

    required_fields = ['origin', 'destination', 'transport_mode', 'arrival_time']
    for field in required_fields:
        if field not in request_body:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': f'Missing required field: {field}'})
            }

    direction = get_directions(request_body)

    return {
        'statusCode': 200,
        'headers': cors_headers,
        'body': json.dumps(direction)
    }


def get_directions(request):
    api_key = os.environ.get('GOOGLE_DIRECTIONS_API_KEY', '')
    params = f"origin={request['origin']}&destination={request['destination']}&mode={request['transport_mode']}"
    if request['arrival_time'] != "":
        params += f"&arrival_time={request['arrival_time']}"

    url = f"https://maps.googleapis.com/maps/api/directions/json?{params}&language=en&key={api_key}"

    http = urllib3.PoolManager()
    try:
        response = http.request('GET', url).data.decode()
        return json.loads(response)
    except Exception as e:
        print('Directions API error:', e)
        return {'status': 'REQUEST_FAILED', 'error_message': str(e)}
