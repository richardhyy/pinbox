from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from .models import BaseMap
import api.models as models


class MapViewTests(TestCase):
    username = 'testuser'
    password = '12345'
    collaborator_username = 'collaborator'
    collaborator_password = '12345'

    def setUp(self):
        self.user = User.objects.create_user(username=self.username, password=self.password)
        self.client.login(username=self.username, password=self.password)

        # Create base-map
        self.base_map = BaseMap.objects.create(
            name='OpenStreetMap',
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            max_zoom=19)

    def _get_last_private_map_id(self):
        map = models.Map.objects.filter(public=False).last()
        return map.id

    def _get_last_point_id(self):
        point = models.Point.objects.filter(created_by=self.user).last()
        return point.id

    def _get_last_line_id(self):
        line = models.LineString.objects.filter(created_by=self.user).last()
        return line.id

    def test_create_map(self):
        url = reverse('api:create_map')
        response = self.client.post(url, {'name': 'test_map', 'description': 'test_description'})
        self.assertEqual(response.status_code, 200)

    def test_get_private_map_list(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        # Get private map list
        response = self.client.get(reverse('api:get_private_maps'))
        self.assertContains(response, 'test_map', status_code=200)

    def test_get_public_map_list(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map_private', 'description': 'test_description'})
        self.client.post(reverse('api:create_map'), {'name': 'test_map_private', 'description': 'test_description'})

        response = self.client.post(reverse('api:update_map', kwargs={'map_id': self._get_last_private_map_id()}),
                                    {
                                        'name': 'test_map_public',
                                        'public': 'true'
                                    })
        self.assertEqual(response.status_code, 200)

        # Get public map list
        response = self.client.get(reverse('api:get_public_maps'))
        self.assertContains(response, 'test_map_public', status_code=200)

    def test_get_map_details(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        # Get map details
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': self._get_last_private_map_id()}))
        self.assertContains(response, 'test_map', status_code=200)

    def test_update_map(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        # Update map
        response = self.client.post(reverse('api:update_map', kwargs={'map_id': self._get_last_private_map_id()}),
                                    {
                                        'name': 'test_map_updated',
                                        'description': 'test_description_updated',
                                        'public': True,
                                        'base_map': self.base_map.id
                                    })
        map_id = self._get_last_private_map_id()
        # Get map details
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_map_updated', status_code=200)
        self.assertContains(response, 'test_description_updated', status_code=200)
        self.assertContains(response, 'OpenStreetMap', status_code=200)

    def test_delete_map(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Delete map
        response = self.client.post(reverse('api:delete_map', kwargs={'map_id': map_id}))
        self.assertEqual(response.status_code, 200)
        # Get map details
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': map_id}))
        self.assertEqual(response.status_code, 404)

    def test_create_point(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create point
        response = self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point',
                                        'longitude': 123.456,
                                        'latitude': 67.89,
                                    })
        self.assertContains(response, '123.456', status_code=200)
        # Get points
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_point', status_code=200)

    def test_update_point(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create point
        self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point',
                                        'longitude': 123.456,
                                        'latitude': 67.89,
                                    })
        # Get point list and get the last point id
        models.Point.objects.filter(created_by=self.user).order_by('-id')
        point_id = models.Point.objects.filter(created_by=self.user).order_by('-id')[0].id

        # Update point
        response = self.client.post(reverse('api:update_point', kwargs={'map_id': map_id, 'point_id': point_id}),
                                    {
                                        'name': 'test_point_updated',
                                        'description': 'test_description_updated',
                                        'longitude': 44.55,
                                        'latitude': 66.77,
                                    })
        self.assertEqual(response.status_code, 200)

        # Get points
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_point_updated', status_code=200)
        self.assertContains(response, 'test_description_updated', status_code=200)
        self.assertContains(response, '44.55', status_code=200)

    def test_delete_point(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create point
        self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point',
                                        'longitude': 123.456,
                                        'latitude': 67.89,
                                    })
        # Delete point
        response = self.client.post(reverse('api:delete_point', kwargs={'map_id': map_id, 'point_id': self._get_last_point_id()}))
        self.assertEqual(response.status_code, 200)
        # Get points
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertNotContains(response, '67.89', status_code=200)

    def test_create_line(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create line
        response = self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line',
                                        'linestring': 'LINESTRING(1 1, 2 2, 3 3)'
                                    })
        self.assertContains(response, '1.0, 1.0', status_code=200)
        # Get lines
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_line', status_code=200)

    def test_update_line(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create line
        self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line',
                                        'linestring': 'LINESTRING(1 1, 2 2, 3 3)'
                                    })
        # Get line list and get the last line id
        models.LineString.objects.filter(created_by=self.user).order_by('-id')
        line_id = models.LineString.objects.filter(created_by=self.user).order_by('-id')[0].id

        # Update line
        response = self.client.post(reverse('api:update_line', kwargs={'map_id': map_id, 'line_id': line_id}),
                                    {
                                        'name': 'test_line_updated',
                                        'description': 'test_description_updated',
                                        'linestring': 'LINESTRING(4 4, 5 5, 6 6)'
                                    })
        self.assertEqual(response.status_code, 200)

        # Get lines
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_line_updated', status_code=200)
        self.assertContains(response, '4.0, 4.0', status_code=200)
        self.assertContains(response, 'test_description_updated', status_code=200)

    def test_delete_line(self):
        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create line
        response = self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line',
                                        'linestring': 'LINESTRING(1 1, 2 2, 3 3)'
                                    })
        # Delete line
        response = self.client.post(reverse('api:delete_line', kwargs={'map_id': map_id, 'line_id': self._get_last_line_id()}))
        self.assertEqual(response.status_code, 200)
        # Get lines
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertNotContains(response, '2.0, 2.0', status_code=200)

    def test_collaborating(self):
        # Create collaborator
        collaborator_user = User.objects.create_user(username=self.collaborator_username,
                                                     password=self.collaborator_password)
        collaborator_user.save()

        # Create map
        self.client.post(reverse('api:create_map'), {'name': 'test_map', 'description': 'test_description'})
        map_id = self._get_last_private_map_id()
        # Create point
        self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point',
                                        'longitude': 123.456,
                                        'latitude': 67.89,
                                    })
        # Create line
        self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line',
                                        'linestring': 'LINESTRING(1 1, 2 2, 3 3)'
                                    })

        # Update map's collaborator list
        response = self.client.post(reverse('api:update_map', kwargs={'map_id': map_id}),
                                    {
                                        'collaborators[]': [self.collaborator_username],
                                    })
        self.assertIs(response.status_code, 200)

        # Set cursor
        response = self.client.post(reverse('api:set_cursor_position', kwargs={'map_id': map_id}),
                                    {
                                        'longitude': 123.456,
                                        'latitude': 67.89,
                                    })
        self.assertIs(response.status_code, 200)

        # Get cursor
        response = self.client.get(reverse('api:get_cursor_positions', kwargs={'map_id': map_id}))
        # Should not contain the current viewer's cursor
        self.assertNotContains(response, '123.456', status_code=200)

        # Update cursor
        response = self.client.post(reverse('api:set_cursor_position', kwargs={'map_id': map_id}),
                                    {
                                        'longitude': 54.32,
                                        'latitude': -12.34,
                                    })
        self.assertIs(response.status_code, 200)

        # Logout owner and login collaborator
        self.client.logout()
        self.client.login(username=self.collaborator_username, password=self.collaborator_password)

        # Get cursor as collaborator
        response = self.client.get(reverse('api:get_cursor_positions', kwargs={'map_id': map_id}))
        self.assertContains(response, '54.32', status_code=200)

        # Update cursor as collaborator
        response = self.client.post(reverse('api:set_cursor_position', kwargs={'map_id': map_id}),
                                    {
                                        'longitude': -65.43,
                                        'latitude': -34.12,
                                    })
        self.assertIs(response.status_code, 200)

        # Collaborator can see map
        response = self.client.get(reverse('api:get_shared_maps'))
        self.assertContains(response, 'test_map', status_code=200)
        # Collaborator can see features
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, '67.89', status_code=200)
        # Collaborator can see map's metadata
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': map_id}))
        self.assertContains(response, 'test_map', status_code=200)
        # Collaborator can delete features from map
        response = self.client.get(reverse('api:delete_point', kwargs={'map_id': map_id, 'point_id': 1}))
        self.assertEqual(response.status_code, 200)
        response = self.client.get(reverse('api:delete_line', kwargs={'map_id': map_id, 'line_id': 1}))
        self.assertEqual(response.status_code, 200)
        # Collaborator can NOT delete map
        response = self.client.get(reverse('api:delete_map', kwargs={'map_id': map_id}))
        self.assertEqual(response.status_code, 403)
        # Collaborator can add features to map
        response = self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point_collaborator',
                                        'longitude': 65.43,
                                        'latitude': 54.32,
                                    })
        self.assertContains(response, '65.43', status_code=200)
        response = self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line_collaborator',
                                        'linestring': 'LINESTRING(5 5, 6 6, 7 7)'
                                    })
        self.assertContains(response, '6.0, 6.0', status_code=200)

        # Logout collaborator and login owner
        self.client.logout()
        self.client.login(username=self.username, password=self.password)

        # Map owner can see collaborator's features
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertContains(response, '65.43', status_code=200)
        # Map owner can delete collaborator's features
        response = self.client.get(reverse('api:delete_point', kwargs={'map_id': map_id, 'point_id': 2}))
        self.assertEqual(response.status_code, 200)
        response = self.client.get(reverse('api:delete_line', kwargs={'map_id': map_id, 'line_id': 2}))
        self.assertEqual(response.status_code, 200)

    def test_share_link_creation(self):
        # Create map
        self.client.post(reverse('api:create_map'),
                                    {
                                        'name': 'test_map',
                                        'description': 'test_description'
                                    })
        map_id = self._get_last_private_map_id()

        # Share map
        response = self.client.post(reverse('api:update_map', kwargs={'map_id': map_id}),
                                    {
                                        'public': 'true'
                                    })
        self.assertEqual(response.status_code, 200)
        # Get map detail
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': map_id}))
        self.assertContains(response, 'public": true', status_code=200)

        # Logout
        self.client.logout()

        # The following tests are performed by an anonymous visitor who is not permitted perform any edit operations
        # Get map detail
        response = self.client.get(reverse('api:get_map_detail', kwargs={'map_id': map_id}))
        self.assertEqual(response.status_code, 200)
        # Get features
        response = self.client.get(reverse('api:filter_features', kwargs={'map_id': map_id}))
        self.assertEqual(response.status_code, 200)
        # Test delete feature
        response = self.client.get(reverse('api:delete_point', kwargs={'map_id': map_id, 'point_id': 1}))
        self.assertNotEqual(response.status_code, 200)
        response = self.client.get(reverse('api:delete_line', kwargs={'map_id': map_id, 'line_id': 1}))
        self.assertNotEqual(response.status_code, 200)
        # Test add feature
        response = self.client.post(reverse('api:create_point', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_point',
                                        'longitude': 65.43,
                                        'latitude': 54.32,
                                    })
        self.assertNotEqual(response.status_code, 200)
        response = self.client.post(reverse('api:create_line', kwargs={'map_id': map_id}),
                                    {
                                        'name': 'test_line',
                                        'linestring': 'LINESTRING(5 5, 6 6, 7 7)'
                                    })
        self.assertNotEqual(response.status_code, 200)
        # Test update map info
        response = self.client.post(reverse('api:update_map', kwargs={'map_id': map_id}),
                                            data={'name': 'test_map_updated', 'description': 'test_description_updated'})
        self.assertNotEqual(response.status_code, 200)
        # Test delete map
        response = self.client.get(reverse('api:delete_map', kwargs={'map_id': map_id}))
        self.assertNotEqual(response.status_code, 200)

