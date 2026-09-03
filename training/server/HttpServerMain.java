import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/*
 * ============================================================
 *  サーバーの全体像（このクラスがやっていること）
 * ============================================================
 *
 *   [クライアント]                     [このサーバー]
 *        |                                  |
 *        | 1. 接続してくる  ------------->  | ServerSocket が待ち受け中
 *        |                                  |
 *        | <----------- 2. 「ようこそ」を送る |
 *        |                                  |
 *        | 3. 「こんにちは」と送る -------> | 1行受信して読む
 *        |                                  |
 *        | <----------- 4. 「こんにちは」を返す |
 *        |                                  |
 *
 *  HTTPのような「1回のやり取りで終わり」ではなく、
 *  接続している間に複数回メッセージをやり取りする作りにしている。
 * ============================================================
 */
public class HttpServerMain {

    // ------------------------------------------------------------
    // このブロックは「サーバー側で、接続の受け付けをずっと繰り返す」コードです。
    // ポートを開けて待ち、誰かが接続してきたら1件ずつ相手をする。
    // ------------------------------------------------------------
    public static void main(String[] args) throws IOException {
        // ポートの設定、変更はここから
        int port = 8080;

        // ポート8080で「接続を待ち受ける口」を開く。
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("Listening on port " + port + " ...");

            // 一人（1接続）ずつ順番に相手をする、一番シンプルな作りにしている。
            // （同時に複数人を相手するには「並行処理」が必要だが、ここではやらない）
            while (true) {
                // クライアントが接続してくるまでここでブロックして待つ。
                Socket client = serverSocket.accept();
                System.out.println("--- connection accepted from " + client.getRemoteSocketAddress() + " ---");

                try {
                    handleOneConversation(client);
                } catch (IOException e) {
                    System.out.println("error while handling client: " + e.getMessage());
                } finally {
                    client.close();
                }
            }
        }
    }

    // ------------------------------------------------------------
    // このブロックは「サーバー側で、1件の接続とのやり取りを最初から最後まで処理する」コードです。
    // 挨拶を送る → メッセージを受け取る → 返事をする、という3ステップに分けて、
    // それぞれ専用のメソッドに任せているだけ。
    // ------------------------------------------------------------
    private static void handleOneConversation(Socket client) throws IOException {
        BufferedReader reader = new BufferedReader(
                new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
        PrintWriter writer = new PrintWriter(
                new OutputStreamWriter(client.getOutputStream(), StandardCharsets.UTF_8), true);

        sendWelcome(writer);

        String message = receiveMessage(reader);

        replyToMessage(writer, message);
    }

    // ------------------------------------------------------------
    // このブロックは「サーバー側で、接続してきた相手に挨拶を送る」コードです。
    // クライアントが何か送ってくるより先に、サーバーから声をかける。
    // ------------------------------------------------------------
    private static void sendWelcome(PrintWriter writer) {
        System.out.println("--- sending welcome ---");
        writer.println("ようこそ");
    }

    // ------------------------------------------------------------
    // このブロックは「サーバー側で、クライアントが送ってきた1行を受信する」コードです。
    // ------------------------------------------------------------
    private static String receiveMessage(BufferedReader reader) throws IOException {
        String message = reader.readLine();
        System.out.println("received: " + message);
        return message;
    }

    // ------------------------------------------------------------
    // このブロックは「サーバー側で、受け取った内容に応じて返事をする」コードです。
    // 「こんにちは」が届いたときだけ「こんにちは」と返す。
    // ------------------------------------------------------------
    private static void replyToMessage(PrintWriter writer, String message) {
        if ("こんにちは".equals(message)) {
            System.out.println("--- sending reply ---");
            writer.println("こんにちは");
        }
    }
}
