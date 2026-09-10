"""Generate an email- and role-specific registration code; deliver privately."""
import argparse
from app.core.security import create_invitation
from app.models import UserRole


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("role", choices=[r.value for r in UserRole if r != UserRole.ADMIN])
    args = parser.parse_args()
    print(create_invitation(args.email, args.role))
