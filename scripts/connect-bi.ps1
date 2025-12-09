# Create SSH tunnel to remote Supabase database
# Local port 6543 -> Remote port 54322
ssh -L 6543:127.0.0.1:54322 root@46.224.83.79
