import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

/*
 * ============================================================
 *  クライアントの全体像（このクラスがやっていること）
 * ============================================================
 *
 *   [このクライアント]                  [サーバー]
 *        |                                  |
 *        | 1. サーバーに接続する ------->   |
 *        |                                  |
 *        | <----------- 2. 「ようこそ」が届く |
 *        |                                  |
 *        | 3. キーボードから入力して送る --> |
 *        |    （例：「こんにちは」）         |
 *        |                                  |
 *        | <----------- 4. サーバーからの返事が届く |
 *        |                                  |
 *
 *  HttpServerMain.java の「ステップ1〜4」と対になっている。
 * ============================================================
 */
public class HttpClientMain {

    // ------------------------------------------------------------
    // このブロックは「Client側で、サーバーへの接続からやり取りの表示までを
    // ひととおり行う」コードです。
    // 接続 → 挨拶の表示 → 入力の送信 → 返事の表示、という流れを
    // それぞれ専用のメソッドに任せているだけ。
    // ------------------------------------------------------------
    public static void main(String[] args) throws IOException {
        String host = "localhost";
        // ポートの設定、変更はここから
        int port = 8080;

        // サーバーに接続する。ここでTCPの接続が確立する。
        try (Socket socket = new Socket(host, port)) {
            System.out.println("connected to " + host + ":" + port);

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);

            printWelcome(reader);

            sendUserInput(writer);

            printReply(reader);
        }
    }

    // ------------------------------------------------------------
    // このブロックは「Client側で、サーバーからの挨拶を受け取って表示する」コードです。
    // ------------------------------------------------------------
    private static void printWelcome(BufferedReader reader) throws IOException {
        String welcome = reader.readLine();
        System.out.println("server: " + welcome);
    }

    // ------------------------------------------------------------
    // このブロックは「Client側で、キーボードから入力してもらった内容を
    // サーバーへ送信する」コードです。
    // ------------------------------------------------------------
    private static void sendUserInput(PrintWriter writer) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("client: ");
        String message = scanner.nextLine();

        writer.println(message); // 送信を確定させる（println自身がflushする設定にしてある）
    }

    // ------------------------------------------------------------
    // このブロックは「Client側で、サーバーからの返事を受け取って表示する」コードです。
    // ------------------------------------------------------------
    private static void printReply(BufferedReader reader) throws IOException {
        String reply = reader.readLine();
        if (reply != null) {
            System.out.println("server: " + reply);
        }
    }
}
