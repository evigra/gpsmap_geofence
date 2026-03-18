from odoo import api, fields, models     
import hashlib, datetime, pytz

class gps_geofence(models.Model):
    _name = "gps_geofence"
    _description = 'GPS Geofence'
    


    name = fields.Char(string='Nombre', required=True)
    polygon_coords = fields.Text(
        string="Coordenadas"
    )



    geofence_type = fields.Selection([
        ('polygon', 'Polygon'),
        ('circle', 'Circle'),
        ('rectangle', 'Rectangle'),
    ], string='Tipo')

    description = fields.Char('Description', size = 150)
    area = fields.Text('area')
    attributes = fields.Text('Attributes')
    color = fields.Selection([
        ('green', 'Green'),
        ('red', 'Red'),
        ('blue', 'Blue'),
        ('black', 'Black'),
        ('grey', 'Grey'),
        ('yellow', 'Yellow'),
        ], 'Color', default = 'green', help = 'Color of geofence')
    hidden = fields.Boolean('Hidden')

