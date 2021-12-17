from django.urls import path, include

from . import views

app_name = 'interface'
urlpatterns = [
    # Map related
    path('map/list/private', views.get_private_maps, name='get_private_maps'),
    path('map/list/shared', views.get_shared_maps, name='get_shared_maps'),
    path('map/list/public', views.get_public_maps, name='get_public_maps'),
    path('map/detail/<int:map_id>', views.get_map_detail, name='get_map_detail'),
    path('map/create', views.create_map, name='create_map'),
    path('map/update/<int:map_id>', views.update_map, name='update_map'),
    path('map/delete/<int:map_id>', views.delete_map, name='delete_map'),
    path('map/sharelink/<int:map_id>', views.get_map_share_link, name='map_share_link'),

    # Entity related
    path('entity/filter/<int:map_id>', views.filter_features, name='filter_features'),

    path('entity/point/create/<int:map_id>', views.create_point, name='create_point'),
    path('entity/point/update/<int:map_id>/<int:point_id>', views.update_point, name='update_point'),
    path('entity/point/delete/<int:map_id>/<int:point_id>', views.delete_point, name='delete_point'),

    path('entity/line/create/<int:map_id>', views.create_line, name='create_line'),
    path('entity/line/update/<int:map_id>/<int:line_id>', views.update_line, name='update_line'),
    path('entity/line/delete/<int:map_id>/<int:line_id>', views.delete_line, name='delete_line'),

    # Style related
    path('style/basemap/list', views.get_base_maps, name='get_base_maps'),

    # Map collaboration
    path('collaboration/collaborator/add/<int:map_id>', views.add_collaborator, name='add_collaborator'),
    path('collaboration/collaborator/remove/<int:map_id>', views.remove_collaborator, name='remove_collaborator'),
    path('collaboration/collaborator/list/<int:map_id>', views.get_collaborators, name='get_collaborators'),
    path('collaboration/session/cursor/list/<int:map_id>', views.get_cursor_positions, name='get_cursor_positions'),
    path('collaboration/session/cursor/set/<int:map_id>', views.set_cursor_position, name='set_cursor_position'),
]
