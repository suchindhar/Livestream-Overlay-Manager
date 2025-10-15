import subprocess
import os
import time

# This script converts an RTSP stream to HLS (m3u8) using FFmpeg

def convert_rtsp_to_hls(rtsp_url, output_dir="hls_streams", hls_segment_duration=4):
    """
    Convert RTSP stream to HLS format
    :param rtsp_url: RTSP URL (e.g., rtsp://example.com/stream)
    :param output_dir: Directory to save HLS files
    :param hls_segment_duration: Duration of each .ts segment (seconds)
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Output HLS playlist and segments
    output_playlist = os.path.join(output_dir, "stream.m3u8")
    output_segments = os.path.join(output_dir, "segment_%03d.ts")

    # FFmpeg command
    command = [
        'ffmpeg',
        '-rtsp_transport', 'tcp',  # Use TCP transport for stability
        '-i', rtsp_url,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-f', 'hls',
        '-hls_time', str(hls_segment_duration),
        '-hls_list_size', '5',  # Keep last 5 segments in playlist
        '-hls_flags', 'delete_segments',  # Delete old segments
        '-hls_segment_filename', output_segments,
        output_playlist
    ]

    print(f"🚀 Converting {rtsp_url} to HLS...")
    print(f"📁 Output: {output_playlist}")

    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("⏳ Stream conversion started...")

        # Keep running until user stops it
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Stopping stream conversion...")
        process.terminate()
        print("✅ Stream stopped.")

if __name__ == '__main__':
    # Example RTSP test stream (replace with your own)
    TEST_RTSP_URL = 'rtsp://807e9439d5ca.entrypoint.cloud.wowza.com:1935/app-rC94792j/068b9c9a_stream2'
    convert_rtsp_to_hls(TEST_RTSP_URL)