import os
from PIL import Image, ImageDraw, ImageOps

SOURCE_LOGO = 'public/Tour Logo.png'
BG_TEAL = (19, 78, 74) # #134e4a

def generate_web_assets(src_im):
    print("Generating web & PWA assets...")
    
    # 1. logo.png (512x512)
    logo_512 = src_im.resize((512, 512), Image.Resampling.LANCZOS)
    logo_512.save('public/logo.png', 'PNG', optimize=True)
    
    # 2. app-logo.jpeg (1024x1024)
    rgb_im = src_im.convert('RGB')
    rgb_im.save('public/app-logo.jpeg', 'JPEG', quality=95)
    
    # 3. favicon.png (128x128)
    fav_128 = src_im.resize((128, 128), Image.Resampling.LANCZOS)
    fav_128.save('public/favicon.png', 'PNG', optimize=True)
    
    # 4. favicon.ico (16, 32, 48)
    fav_16 = src_im.resize((16, 16), Image.Resampling.LANCZOS)
    fav_32 = src_im.resize((32, 32), Image.Resampling.LANCZOS)
    fav_48 = src_im.resize((48, 48), Image.Resampling.LANCZOS)
    fav_48.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[fav_16, fav_32])
    
    # 5. apple-touch-icon.png (180x180)
    apple_180 = src_im.resize((180, 180), Image.Resampling.LANCZOS)
    apple_180.save('public/apple-touch-icon.png', 'PNG', optimize=True)
    
    # 6. icon-192.png & icon-512.png (PWA)
    icon_192 = src_im.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save('public/icon-192.png', 'PNG', optimize=True)
    
    icon_512 = src_im.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save('public/icon-512.png', 'PNG', optimize=True)
    print("Web & PWA assets complete.")

def generate_android_launcher_icons(src_im):
    print("Generating Android mipmap launcher icons...")
    
    densities = {
        'mipmap-mdpi': {'launcher': 48, 'fg': 108},
        'mipmap-hdpi': {'launcher': 72, 'fg': 162},
        'mipmap-xhdpi': {'launcher': 96, 'fg': 216},
        'mipmap-xxhdpi': {'launcher': 144, 'fg': 324},
        'mipmap-xxxhdpi': {'launcher': 192, 'fg': 432},
    }
    
    res_dir = 'android/app/src/main/res'
    
    for folder, sizes in densities.items():
        dir_path = os.path.join(res_dir, folder)
        os.makedirs(dir_path, exist_ok=True)
        
        l_size = sizes['launcher']
        fg_size = sizes['fg']
        
        # A. Adaptive Foreground: canvas fg_size x fg_size, logo scaled to 72%
        fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        target_logo_size = int(fg_size * 0.72)
        resized_logo = src_im.resize((target_logo_size, target_logo_size), Image.Resampling.LANCZOS)
        offset = (fg_size - target_logo_size) // 2
        fg.paste(resized_logo, (offset, offset), mask=resized_logo)
        fg.save(os.path.join(dir_path, 'ic_launcher_foreground.png'), 'PNG', optimize=True)
        
        # B. Legacy Launcher (square with subtle rounded corner on white)
        launcher = Image.new('RGBA', (l_size, l_size), (255, 255, 255, 255))
        target_l = int(l_size * 0.90)
        r_logo = src_im.resize((target_l, target_l), Image.Resampling.LANCZOS)
        l_offset = (l_size - target_l) // 2
        launcher.paste(r_logo, (l_offset, l_offset), mask=r_logo)
        
        # Round the edges slightly for legacy launcher
        r_mask = Image.new('L', (l_size, l_size), 0)
        draw = ImageDraw.Draw(r_mask)
        draw.rounded_rectangle([(0, 0), (l_size, l_size)], radius=max(4, int(l_size * 0.16)), fill=255)
        launcher_out = Image.new('RGBA', (l_size, l_size), (0, 0, 0, 0))
        launcher_out.paste(launcher, (0, 0), mask=r_mask)
        launcher_out.save(os.path.join(dir_path, 'ic_launcher.png'), 'PNG', optimize=True)
        
        # C. Round Launcher (circle clipped)
        round_mask = Image.new('L', (l_size, l_size), 0)
        draw_round = ImageDraw.Draw(round_mask)
        draw_round.ellipse([(0, 0), (l_size, l_size)], fill=255)
        round_out = Image.new('RGBA', (l_size, l_size), (0, 0, 0, 0))
        round_out.paste(launcher, (0, 0), mask=round_mask)
        round_out.save(os.path.join(dir_path, 'ic_launcher_round.png'), 'PNG', optimize=True)
        
    print("Android mipmap icons complete.")

def generate_android_splash_screens(src_im):
    print("Generating Android splash screens...")
    
    splash_targets = {
        'android/app/src/main/res/drawable/splash.png': (480, 320),
        'android/app/src/main/res/drawable-port-mdpi/splash.png': (320, 480),
        'android/app/src/main/res/drawable-port-hdpi/splash.png': (480, 800),
        'android/app/src/main/res/drawable-port-xhdpi/splash.png': (720, 1280),
        'android/app/src/main/res/drawable-port-xxhdpi/splash.png': (960, 1600),
        'android/app/src/main/res/drawable-port-xxxhdpi/splash.png': (1280, 1920),
        'android/app/src/main/res/drawable-land-mdpi/splash.png': (480, 320),
        'android/app/src/main/res/drawable-land-hdpi/splash.png': (800, 480),
        'android/app/src/main/res/drawable-land-xhdpi/splash.png': (1280, 720),
        'android/app/src/main/res/drawable-land-xxhdpi/splash.png': (1600, 960),
        'android/app/src/main/res/drawable-land-xxxhdpi/splash.png': (1920, 1280),
    }
    
    for path, (w, h) in splash_targets.items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        splash = Image.new('RGB', (w, h), BG_TEAL)
        
        # Determine card size relative to smallest dimension
        min_dim = min(w, h)
        card_size = int(min_dim * 0.52)
        radius = max(16, int(card_size * 0.14))
        
        # Create rounded card with the logo
        card_img = Image.new('RGBA', (card_size, card_size), (0, 0, 0, 0))
        mask = Image.new('L', (card_size, card_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (card_size, card_size)], radius=radius, fill=255)
        
        logo_resized = src_im.resize((card_size, card_size), Image.Resampling.LANCZOS)
        card_img.paste(logo_resized, (0, 0), mask=mask)
        
        # Paste card into center of splash
        card_x = (w - card_size) // 2
        card_y = (h - card_size) // 2
        splash.paste(card_img, (card_x, card_y), mask=card_img)
        
        splash.save(path, 'PNG', optimize=True)
        
    print("Android splash screens complete.")

def main():
    if not os.path.exists(SOURCE_LOGO):
        raise FileNotFoundError(f"Source logo not found at {SOURCE_LOGO}")
    
    src_im = Image.open(SOURCE_LOGO).convert('RGBA')
    generate_web_assets(src_im)
    generate_android_launcher_icons(src_im)
    generate_android_splash_screens(src_im)
    print("All icons, favicons, logos, and splash screens successfully replaced!")

if __name__ == '__main__':
    main()
