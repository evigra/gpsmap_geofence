from odoo import api, fields, models     
import hashlib, datetime, pytz

class gps_geofence(models.Model):
    _inherit = "gps_geofence"
